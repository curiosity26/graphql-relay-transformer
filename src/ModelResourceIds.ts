import { graphqlName, toUpper, toCamelCase, DEFAULT_SCALARS } from 'graphql-transformer-common';

export class ModelResourceIDs {
  static ModelTableResourceID(typeName: string): string {
    return `${typeName}Table`;
  }

  static ModelTableStreamArn(typeName: string): string {
    return `${typeName}TableStreamArn`;
  }

  static ModelTableDataSourceID(typeName: string): string {
    return `${typeName}DataSource`;
  }

  static ModelTableIAMRoleID(typeName: string): string {
    return `${typeName}IAMRole`;
  }

  static ModelFilterInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}FilterInput`;
    }
    return `RelayModel${name}FilterInput`;
  }

  static ModelFilterScalarInputTypeName(name: string, includeFilter: Boolean): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}${includeFilter ? 'Filter' : ''}Input`;
    }
    return `RelayModel${name}${includeFilter ? 'Filter' : ''}Input`;
  }

  static ModelConditionInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}ConditionInput`;
    }
    return `RelayModel${name}ConditionInput`;
  }

  static ModelKeyConditionInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}KeyConditionInput`;
    }
    return `RelayModel${name}KeyConditionInput`;
  }

  static ModelCompositeKeyArgumentName(keyFieldNames: string[]) {
    return toCamelCase(keyFieldNames.map(n => graphqlName(n)));
  }

  static ModelCompositeKeySeparator() {
    return '#';
  }

  static ModelCompositeAttributeName(keyFieldNames: string[]) {
    return keyFieldNames.join(ModelResourceIDs.ModelCompositeKeySeparator());
  }

  static ModelCompositeKeyConditionInputTypeName(modelName: string, keyName: string): string {
    return `RelayModel${modelName}${keyName}CompositeKeyConditionInput`;
  }

  static ModelCompositeKeyInputTypeName(modelName: string, keyName: string): string {
    return `RelayModel${modelName}${keyName}CompositeKeyInput`;
  }

  static ModelFilterListInputTypeName(name: string, includeFilter: Boolean): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}List${includeFilter ? 'Filter' : ''}Input`;
    }
    return `RelayModel${name}List${includeFilter ? 'Filter' : ''}Input`;
  }

  static ModelScalarFilterInputTypeName(name: string, includeFilter: Boolean): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `RelayModel${nameOverride}${includeFilter ? 'Filter' : ''}Input`;
    }
    return `RelayModel${name}${includeFilter ? 'Filter' : ''}Input`;
  }

  static ModelConnectionTypeName(typeName: string): string {
    return `RelayModel${typeName}Connection`;
  }

  static ModelDeleteInputObjectName(typeName: string): string {
    return graphqlName('Delete' + toUpper(typeName) + 'Input');
  }

  static ModelUpdateInputObjectName(typeName: string): string {
    return graphqlName('Update' + toUpper(typeName) + 'Input');
  }

  static ModelCreateInputObjectName(typeName: string): string {
    return graphqlName(`Create` + toUpper(typeName) + 'Input');
  }

  static ModelOnCreateSubscriptionName(typeName: string): string {
    return graphqlName(`onCreate` + toUpper(typeName));
  }

  static ModelOnUpdateSubscriptionName(typeName: string): string {
    return graphqlName(`onUpdate` + toUpper(typeName));
  }

  static ModelOnDeleteSubscriptionName(typeName: string): string {
    return graphqlName(`onDelete` + toUpper(typeName));
  }

  static ModelAttributeTypesName(): string {
    return `RelayModelAttributeTypes`;
  }

  static ModelSizeInputTypeName(): string {
    return `RelayModelSizeInput`;
  }

  static NonModelInputObjectName(typeName: string): string {
    return graphqlName(toUpper(typeName) + 'Input');
  }

  static UrlParamsInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(toUpper(typeName) + toUpper(fieldName) + 'ParamsInput');
  }

  static HttpQueryInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(toUpper(typeName) + toUpper(fieldName) + 'QueryInput');
  }

  static HttpBodyInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(toUpper(typeName) + toUpper(fieldName) + 'BodyInput');
  }
}
