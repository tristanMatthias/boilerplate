import { ErrorAuthInvalidDetails } from '@brix/api';
import { BrixContext, BrixContextUser, comparePassword } from '@brix/core';
import { getStore } from '@brix/model';
import { User } from '@brix/plugin-entity-user';
import { Arg, Authorized, Ctx, Field, ObjectType, Query, Resolver } from 'type-graphql';

import { generateToken, verifyToken } from './lib/tokens';



@ObjectType()
export class LoginOutput {
  @Field()
  accessToken: string;
  @Field()
  userId: string;
  @Field()
  expiry: number;
}


@Resolver()
export class AuthResolver {
  User = getStore().model<BrixContextUser & { password: string }>('User');


  /** Login a user with email and password */
  @Query(() => LoginOutput)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx('fingerprint') fingerprint: string
  ): Promise<LoginOutput> {

    const user = await this.User.findOne({ where: { email } });

    // Check user exists
    if (!user) throw new ErrorAuthInvalidDetails();
    const userId = user.id;

    // TODO: Email verification
    // // Check email is verified
    // if (!user.verifiedEmail) throw new ErrorAuthInvalidDetails();

    // Check password
    if (!(await comparePassword(password, user.password))) throw new ErrorAuthInvalidDetails();

    const { accessToken, expiry } = await generateToken(fingerprint, user);

    return { accessToken, expiry, userId };
  }


  /** Verify a JWT */
  @Query(() => Boolean)
  verifyToken(
    @Arg('accessToken') accessToken: string,
    @Ctx('fingerprint') fingerprint: string
  ) {
    return Boolean(verifyToken(fingerprint, accessToken));
  }

  /** Get the current user */
  @Query(() => User)
  @Authorized()
  me(@Ctx() ctx: BrixContext) {
    return this.User.findById(ctx.user!.id);
  }
}
