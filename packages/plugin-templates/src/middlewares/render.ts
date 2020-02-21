import consolidate from 'consolidate';
import { Express, Router } from 'express';
import path from 'path';
import recursive from 'recursive-readdir';

import { PluginCMSOptions } from '..';
import { logger } from '@brix/core';

/**
 * Enables pages to be rendered
 * @param options CMS Options
 */
export const render = (options: PluginCMSOptions) =>
  async (app: Express) => {
    const viewDir = options.viewDir || path.resolve(process.cwd(), 'views');
    app.set('views', viewDir);

    const router = Router();


    /**
     * Load all avaiable pages and templates able to be rendered and store in
     * `res.locals.templates`
     */
    router.use(async (_req, res, next) => {
      const files = (await recursive(viewDir, ['*.gql']));
      const paths = files.map(
        p => path.relative(viewDir, (p))
      ).reduce((paths, f, i) => {
        const _p = f.slice(0, path.extname(f).length * -1);
        paths[`/${_p}`] = files[i];
        if (_p.split('/').pop() === 'index') {
          paths[`/${_p.split('/').slice(0, -1).join('/')}`] = files[i];
        }
        return paths;
      }, {} as { [path: string]: string });

      res.locals.templates = paths;
      next();
    });


    /**
     * If the `req.url` exists in the `res.locals.templates`, attempt to render
     * it.
     */
    router.use(async (req, res, next) => {
      if (res.locals.templates[req.url]) {
        try {
          const data = await consolidate.pug(
            res.locals.templates[req.url],
            res.locals
          );
          res.send(data);
        } catch (e) {
          logger.error(e);
          next();
        }
      }
      else next();
    });


    // Prefix the router
    if (options.prefix) app.use(options.prefix, router);
    else app.use(router);
  };
