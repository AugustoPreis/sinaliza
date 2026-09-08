import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { validateBr } from 'js-brasil';
import { i18nValidationMessage } from 'nestjs-i18n';

@ValidatorConstraint({ name: 'isCpf', async: false })
export class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(cpf: string): boolean {
    if (!cpf) return false;

    return validateBr.cpf(cpf);
  }
}

export function IsCpf(options?: ValidationOptions): (object: object, propertyName: string) => void {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: { message: i18nValidationMessage('validation.cpfInvalid'), ...options },
      constraints: [],
      validator: IsCpfConstraint,
    });
  };
}
