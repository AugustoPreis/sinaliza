import { ValidationError, validate } from 'class-validator';

import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from '../i18n-validators';

enum EColor {
  RED = 'RED',
}

class TestDto {
  @IsNotEmpty()
  requiredField!: string;

  @IsString()
  stringField!: unknown;

  @IsEmail()
  emailField!: string;

  @IsUrl()
  urlField!: string;

  @IsUUID()
  uuidField!: string;

  @IsArray()
  arrayField!: unknown;

  @IsEnum(EColor)
  enumField!: unknown;

  @Length(3, 5)
  lengthField!: string;

  @MinLength(3)
  minLengthField!: string;

  @MaxLength(3)
  maxLengthField!: string;

  @Matches(/^[a-z]+$/)
  matchesField!: string;
}

async function validateInvalidDto(): Promise<ValidationError[]> {
  const dto = new TestDto();
  dto.requiredField = '';
  dto.stringField = 123;
  dto.emailField = 'not-an-email';
  dto.urlField = 'not a url';
  dto.uuidField = 'not-a-uuid';
  dto.arrayField = 'not-an-array';
  dto.enumField = 'BLUE';
  dto.lengthField = 'a';
  dto.minLengthField = 'a';
  dto.maxLengthField = 'abcdef';
  dto.matchesField = 'ABC123';

  return validate(dto);
}

function constraintMessage(
  errors: ValidationError[],
  property: string,
  constraintKey: string,
): string {
  const error = errors.find((e) => e.property === property);
  const message = error?.constraints?.[constraintKey];

  if (!message) {
    throw new Error(`No "${constraintKey}" constraint found for "${property}"`);
  }

  return message;
}

describe('i18n-validators', () => {
  it.each([
    ['requiredField', 'isNotEmpty', 'validation.isNotEmpty'],
    ['stringField', 'isString', 'validation.isString'],
    ['emailField', 'isEmail', 'validation.isEmail'],
    ['urlField', 'isUrl', 'validation.isUrl'],
    ['uuidField', 'isUuid', 'validation.isUuid'],
    ['arrayField', 'isArray', 'validation.isArray'],
    ['enumField', 'isEnum', 'validation.isEnum'],
    ['lengthField', 'isLength', 'validation.isLength'],
    ['minLengthField', 'minLength', 'validation.minLength'],
    ['maxLengthField', 'maxLength', 'validation.maxLength'],
    ['matchesField', 'matches', 'validation.matches'],
  ])(
    'wires %s\'s "%s" constraint to the i18nValidationMessage key "%s"',
    async (property, constraintKey, expectedKey) => {
      const errors = await validateInvalidDto();

      expect(constraintMessage(errors, property, constraintKey)).toMatch(
        new RegExp(`^${expectedKey}\\|`),
      );
    },
  );

  it('embeds min/max args produced by Length() into the raw message', async () => {
    const errors = await validateInvalidDto();

    const message = constraintMessage(errors, 'lengthField', 'isLength');

    expect(message).toContain('"min":3');
    expect(message).toContain('"max":5');
  });
});
