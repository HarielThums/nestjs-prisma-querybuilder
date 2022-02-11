import { HttpException, HttpStatus } from '@nestjs/common';
import { validateOrReject } from 'class-validator';

export default async function validateOrRejectPadrao(data): Promise<void> {
  await validateOrReject(data).catch((errors) => {
    const errMessages = [];

    errors.forEach((err) => {
      if (err.constraints) Object.values(err.constraints).forEach((val) => errMessages.push(val));

      if (err?.children) {
        let children = err.children;

        do {
          /*
            tentantar transformar eses forEach em uma função recursiva, se ouver outro children chama ela de novo, se houver constraints para.
          */
          children.forEach((childrenFilho) => {
            childrenFilho?.children.forEach((childrenFilhoDoFilho) => {
              Object.values(childrenFilhoDoFilho?.constraints).forEach((val) => errMessages.push(val));
              children = childrenFilho.children;
            });
          });
        } while (children?.children);
      }
    });

    throw new HttpException({ statusCode: 400, message: errMessages }, HttpStatus.BAD_REQUEST);
  });
}
