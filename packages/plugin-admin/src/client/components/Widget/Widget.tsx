import React, { useState } from 'react';

import { useAction } from '../../hooks/useAction';
import { Widget as WidgetType } from '../../lib/widgets';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { EntityGrid } from '../EntityGrid/EntityGrid';
import { MutationForm } from '../Form/QueryForm';
import { FormField, FormFieldProps } from '../FormField/FormField';
import { convertColsFromWidget } from '../Table/convertColsFromWidget';
import { QueryTable } from '../Table/QueryTable';
import { TableProps } from '../Table/Table';
import { QueryWidgets } from './QueryWidgets';


export interface WidgetProps {
  widget: WidgetType;
  data?: any;
}


export const Widget: React.FunctionComponent<WidgetProps> = ({
  widget,
  data
}) => {
  if (!widget.widget) return null;

  let content;
  switch (widget.widget) {
    case 'query':
      return <QueryWidgets {...widget} data={data} />;

    case 'entityGrid':
      content = <EntityGrid {...widget} style={{ gridColumn: 'span 12' }} />;
      break;

    case 'table':
      const { columns, rowClick, ...props } = widget;
      const cols = convertColsFromWidget(columns || []);
      const action = rowClick ? useAction(rowClick) : undefined;
      content = <QueryTable
        {...props} columns={cols}
        onRowClick={action as TableProps['onRowClick']}
      />;
      break;

    case 'text':
      content = <p>{widget.text}</p>;
      break;

    case 'form':
      const [values, setValues] = useState();
      content = <MutationForm
        mutation={widget.query}
        variablesKey={widget.variableKey}
        initialValues={data}
        onChange={v => setValues(v)}
      >
        {widget.fields.map(w => <Widget widget={w} data={values} />)}
      </MutationForm>;
      break;

    case 'input':
    case 'checkbox':
    case 'select':
      if (widget.widget === 'select') (widget as FormFieldProps).type = 'select';
      return <FormField {...widget} />;
    case 'button':
      return <Button {...widget}>{widget.text}</Button>;

    default:
      // @ts-ignore
      console.warn(`Unknown widget ${widget.widget}`);
      return null;
  }

  if (!widget.card) return content;

  return <Card
    style={{ gridColumn: `span ${widget.width || 3}` }}
    padding={widget.cardPadding ?? 1}
  >{content}</Card>;

};