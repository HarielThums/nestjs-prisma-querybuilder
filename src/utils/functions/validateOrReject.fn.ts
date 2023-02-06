import { BadRequestException } from '@nestjs/common';
import { validateOrReject, ValidationError } from 'class-validator';

export default async function defaultValidateOrReject(data) {
  await validateOrReject(data).catch((errors: ValidationError[]) => {
    const errMessages: string[] = [];

    errors?.forEach((err: ValidationError) => {
      if (err?.constraints) Object.values(err?.constraints).forEach((val) => errMessages.push(val));

      if (err?.children) {
        err?.children?.forEach((children) => getErrMessages(errMessages, children));
      }
    });

    throw new BadRequestException({ statusCode: 400, message: errMessages });
  });
}

const getErrMessages = (errMessages: string[], children: ValidationError) => {
  if (children?.constraints) {
    Object?.values(children?.constraints)?.forEach((val) => errMessages.push(`${val}`));
  }

  if (children?.children) {
    children?.children.forEach((v) => getErrMessages(errMessages, v));
  }
};
