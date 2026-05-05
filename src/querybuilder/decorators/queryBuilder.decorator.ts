import { Inject } from '@nestjs/common';
import { getQuerybuilderToken } from '../constants/queryBuilder.constants';

export const InjectQuerybuilder = (name?: string) => Inject(getQuerybuilderToken(name));
