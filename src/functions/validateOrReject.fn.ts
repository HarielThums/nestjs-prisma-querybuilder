import { HttpException, HttpStatus } from '@nestjs/common';
import { validateOrReject } from 'class-validator';

export default async function defaultValidateOrReject(data) {
  await validateOrReject(data).catch((errors) => {
    const errMessages = [];

    errors.forEach((err) => {
      if (err.constraints) Object.values(err.constraints).forEach((val) => errMessages.push(val));

      if (err?.children) {
        let children = err.children;

        do {
          children.forEach((grandchild) => {
            grandchild.children.forEach((greatGrandson) => {
              Object.values(greatGrandson?.constraints).forEach((val) => errMessages.push(val));

              children = grandchild.children;
            });
          });
        } while (children.children);
      }
    });

    throw new HttpException({ statusCode: 400, message: errMessages }, HttpStatus.BAD_REQUEST);
  });
}
