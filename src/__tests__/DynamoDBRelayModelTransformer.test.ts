import {
  ObjectTypeDefinitionNode,
  parse,
  FieldDefinitionNode,
  DocumentNode,
  DefinitionNode,
  Kind,
  InputObjectTypeDefinitionNode,
  ListValueNode,
  InputValueDefinitionNode,
  TypeNode,
  NamedTypeNode,
} from 'graphql';
import { FeatureFlagProvider, GraphQLTransform, TRANSFORM_BASE_VERSION, TRANSFORM_CURRENT_VERSION } from 'graphql-transformer-core';
import { DynamoDBRelayModelTransformer } from '../DynamoDBRelayModelTransformer';
import { getBaseType } from 'graphql-transformer-common';
const featureFlags = {
  getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
    if (name === 'improvePluralization') {
      return true;
    }
    if (name === 'validateTypeNameReservedWords') {
      return false;
    }
    return;
  }),
  getNumber: jest.fn(),
  getObject: jest.fn(),
  getString: jest.fn(),
};

test('Test DynamoDBRelayModelTransformer validation happy case', () => {
  const validSchema = `
    type Post @relayModel {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
});

test('Test DynamoDBRelayModelTransformer with query overrides', () => {
  const validSchema = `type Post @relayModel(queries: { get: "customGetPost", list: "customListPost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const createPostInput = getInputType(parsed, 'CreatePostInput');
  expectFieldsOnInputType(createPostInput, ['id', 'title', 'createdAt', 'updatedAt']);
  // This id should always be optional.
  // aka a named type node aka name.value would not be set if it were a non null node
  const idField = createPostInput?.fields?.find(f => f.name.value === 'id');
  expect((idField?.type as NamedTypeNode).name.value).toEqual('ID');
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).toBeDefined();
  expectFields(queryType, ['customGetPost']);
  expectFields(queryType, ['customListPost']);
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).toBeDefined();
  expectFields(subscriptionType, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
  const subField = subscriptionType?.fields?.find(f => f.name.value === 'onCreatePost');
  expect(subField?.directives?.length).toEqual(1);
  expect(subField?.directives?.[0].name.value).toEqual('aws_subscribe');
});

test('Test DynamoDBRelayModelTransformer with mutation overrides', () => {
  const validSchema = `type Post @relayModel(mutations: { create: "customCreatePost", update: "customUpdatePost", delete: "customDeletePost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).toBeDefined();
  expectFields(mutationType, ['customCreatePost', 'customUpdatePost', 'customDeletePost']);
});

test('Test DynamoDBRelayModelTransformer with only create mutations', () => {
  const validSchema = `type Post @relayModel(mutations: { create: "customCreatePost" }) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).toBeDefined();
  expectFields(mutationType, ['customCreatePost']);
  doNotExpectFields(mutationType, ['updatePost']);
});

test('Test DynamoDBRelayModelTransformer with multiple model directives', () => {
  const validSchema = `
    type Post @relayModel {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }

    type User @relayModel {
        id: ID!
        name: String!
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();

  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).toBeDefined();
  expectFields(queryType, ['listPosts']);
  expectFields(queryType, ['listUsers']);

  const stringInputType = getInputType(parsed, 'RelayModelStringFilterInput');
  expect(stringInputType).toBeDefined();
  const booleanInputType = getInputType(parsed, 'RelayModelBooleanFilterInput');
  expect(booleanInputType).toBeDefined();
  const intInputType = getInputType(parsed, 'RelayModelIntFilterInput');
  expect(intInputType).toBeDefined();
  const floatInputType = getInputType(parsed, 'RelayModelFloatFilterInput');
  expect(floatInputType).toBeDefined();
  const idInputType = getInputType(parsed, 'RelayModelIDFilterInput');
  expect(idInputType).toBeDefined();
  const postInputType = getInputType(parsed, 'RelayModelPostFilterInput');
  expect(postInputType).toBeDefined();
  const userInputType = getInputType(parsed, 'RelayModelUserFilterInput');
  expect(userInputType).toBeDefined();

  expect(verifyInputCount(parsed, 'RelayModelStringFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelBooleanFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelIntFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelFloatFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelIDFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelPostFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelUserFilterInput', 1)).toBeTruthy();
});

test('Test DynamoDBRelayModelTransformer with filter', () => {
  const validSchema = `
    type Post @relayModel {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }`;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();

  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).toBeDefined();
  expectFields(queryType, ['listPosts']);

  const connectionType = getObjectType(parsed, 'RelayModelPostConnection');
  expect(connectionType).toBeDefined();

  expect(verifyInputCount(parsed, 'RelayModelStringFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelBooleanFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelIntFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelFloatFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelIDFilterInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'RelayModelPostFilterInput', 1)).toBeTruthy();
});

test('Test DynamoDBRelayModelTransformer with mutations set to null', () => {
  const validSchema = `type Post @relayModel(mutations: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).not.toBeDefined();
});
test('Test DynamoDBRelayModelTransformer with queries set to null', () => {
  const validSchema = `type Post @relayModel(queries: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).toBeDefined();
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).not.toBeDefined();
});
test('Test DynamoDBRelayModelTransformer with subscriptions set to null', () => {
  const validSchema = `type Post @relayModel(subscriptions: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).toBeDefined();
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).toBeDefined();
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).not.toBeDefined();
});
test('Test DynamoDBRelayModelTransformer with queries and mutations set to null', () => {
  const validSchema = `type Post @relayModel(queries: null, mutations: null, subscriptions: null) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).not.toBeDefined();
  const queryType = getObjectType(parsed, 'Query');
  expect(queryType).not.toBeDefined();
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).not.toBeDefined();
});
test('Test DynamoDBRelayModelTransformer with advanced subscriptions', () => {
  const validSchema = `type Post @relayModel(subscriptions: {
            onCreate: ["onFeedUpdated", "onCreatePost"],
            onUpdate: ["onFeedUpdated"],
            onDelete: ["onFeedUpdated"]
        }) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).toBeDefined();
  expectFields(subscriptionType, ['onFeedUpdated', 'onCreatePost']);
  const subField = subscriptionType?.fields?.find(f => f.name.value === 'onFeedUpdated');
  expect(subField?.directives?.length).toEqual(1);
  expect(subField?.directives?.[0].name.value).toEqual('aws_subscribe');
  const mutationsList = subField?.directives?.[0].arguments?.find(a => a.name.value === 'mutations')?.value as ListValueNode;
  const mutList = mutationsList.values.map((v: any) => v.value);
  expect(mutList.length).toEqual(3);
  expect(mutList).toContain('createPost');
  expect(mutList).toContain('updatePost');
  expect(mutList).toContain('deletePost');
});

test('Test DynamoDBRelayModelTransformer with non-model types and enums', () => {
  const validSchema = `
    type Post @relayModel {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
        metadata: [PostMetadata!]!
        appearsIn: [Episode]!
    }
    type PostMetadata {
        tags: Tag
    }
    type Tag {
        published: Boolean
        metadata: PostMetadata
    }
    enum Episode {
        NEWHOPE
        EMPIRE
        JEDI
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();

  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);

  const postMetaDataInputType = getInputType(parsed, 'PostMetadataInput');
  expect(postMetaDataInputType).toBeDefined();
  const tagInputType = getInputType(parsed, 'TagInput');
  expect(tagInputType).toBeDefined();
  expectFieldsOnInputType(tagInputType, ['metadata']);
  const createPostInputType = getInputType(parsed, 'CreatePostInput');
  expectFieldsOnInputType(createPostInputType, ['metadata', 'appearsIn']);
  const updatePostInputType = getInputType(parsed, 'UpdatePostInput');
  expectFieldsOnInputType(updatePostInputType, ['metadata', 'appearsIn']);

  const postModelObject = getObjectType(parsed, 'Post');
  const postMetaDataInputField = getFieldOnInputType(createPostInputType, 'metadata');
  const postMetaDataField = getFieldOnObjectType(postModelObject, 'metadata');
  // this checks that the non-model type was properly "unwrapped", renamed, and "rewrapped"
  // in the generated CreatePostInput type - its types should be the same as in the Post @relayModel type
  verifyMatchingTypes(postMetaDataInputField?.type, postMetaDataField?.type);

  expect(verifyInputCount(parsed, 'PostMetadataInput', 1)).toBeTruthy();
  expect(verifyInputCount(parsed, 'TagInput', 1)).toBeTruthy();
});

test('Test DynamoDBRelayModelTransformer with mutation input overrides when mutations are disabled', () => {
  const validSchema = `type Post @relayModel(mutations: null) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    input CreatePostInput {
        different: String
    }
    input UpdatePostInput {
        different2: String
    }
    input DeletePostInput {
        different3: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const createPostInput = getInputType(parsed, 'CreatePostInput');
  expectFieldsOnInputType(createPostInput, ['different']);
  const updatePostInput = getInputType(parsed, 'UpdatePostInput');
  expectFieldsOnInputType(updatePostInput, ['different2']);
  const deletePostInput = getInputType(parsed, 'DeletePostInput');
  expectFieldsOnInputType(deletePostInput, ['different3']);
});

test('Test DynamoDBRelayModelTransformer with mutation input overrides when mutations are enabled', () => {
  const validSchema = `type Post @relayModel {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    # User defined types always take precedence.
    input CreatePostInput {
        different: String
    }
    input UpdatePostInput {
        different2: String
    }
    input DeletePostInput {
        different3: String
    }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const createPostInput = getInputType(parsed, 'CreatePostInput');
  expectFieldsOnInputType(createPostInput, ['different']);
  const updatePostInput = getInputType(parsed, 'UpdatePostInput');
  expectFieldsOnInputType(updatePostInput, ['different2']);
  const deletePostInput = getInputType(parsed, 'DeletePostInput');
  expectFieldsOnInputType(deletePostInput, ['different3']);
});

test('Test non model objects contain id as a type for fields', () => {
  const validSchema = `
    type Post @relayModel {
      id: ID!
      comments: [Comment]
    }
    type Comment {
      id: String!
      text: String!
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const definition = out.schema;
  expect(definition).toBeDefined();
  const parsed = parse(definition);
  const commentInput = getInputType(parsed, 'CommentInput');
  expectFieldsOnInputType(commentInput, ['id', 'text']);
  const commentObject = getObjectType(parsed, 'Comment');
  const commentInputObject = getInputType(parsed, 'CommentInput');
  const commentObjectIDField = getFieldOnObjectType(commentObject, 'id');
  const commentInputIDField = getFieldOnInputType(commentInputObject, 'id');
  verifyMatchingTypes(commentObjectIDField?.type, commentInputIDField?.type);
});

test('Test schema includes attribute enum when only queries specified', () => {
  const validSchema = `
    type Entity @relayModel(mutations: null, subscriptions: null) {
      id: ID!
      str: String
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
    transformConfig: {
      Version: 5,
    },
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();
});

test('Test only get does not generate superfluous input and filter types', () => {
  const validSchema = `
  type Entity @relayModel(mutations: null, subscriptions: null, queries: {get: "getEntity"}) {
    id: ID!
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
    transformConfig: {
      Version: 5,
    },
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();
});

test('Test timestamp parameters when generating resolvers and output schema', () => {
  const validSchema = `
  type Post @relayModel(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn"}) {
    id: ID!
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();

  expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
});

test('Test resolver template not to auto generate createdAt and updatedAt when the type in schema is not AWSDateTime', () => {
  const validSchema = `
  type Post @relayModel {
    id: ID!
    str: String
    createdAt: AWSTimestamp
    updatedAt: AWSTimestamp
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();

  expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
});

test('Test create and update mutation input should have timestamps as nullable fields when the type makes it non-nullable', () => {
  const validSchema = `
  type Post @relayModel {
    id: ID!
    str: String
    createdAt: AWSDateTime!
    updatedAt: AWSDateTime!
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();

  expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
});

test('Test not to include createdAt and updatedAt field when timestamps is set to null', () => {
  const validSchema = `
  type Post @relayModel(timestamps: null) {
    id: ID!
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toMatchSnapshot();

  expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
  expect(result.resolvers['Mutation.updatePost.req.vtl']).toMatchSnapshot();
});

test(`V${TRANSFORM_BASE_VERSION} transformer snapshot test`, () => {
  const schema = transformerVersionSnapshot(TRANSFORM_BASE_VERSION);
  expect(schema).toMatchSnapshot();
});

test(`V5 transformer snapshot test`, () => {
  const schema = transformerVersionSnapshot(5);
  expect(schema).toMatchSnapshot();
});

test(`Current version transformer snapshot test`, () => {
  const schema = transformerVersionSnapshot(TRANSFORM_CURRENT_VERSION);
  expect(schema).toMatchSnapshot();
});

test('DynamoDB transformer should add default primary key when not defined', () => {
  const validSchema = `
  type Post @relayModel{
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toBeDefined();
  const schema = parse(result.schema);

  const createPostInput = schema.definitions.find(
    d => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
  ) as InputObjectTypeDefinitionNode | undefined;
  expect(createPostInput).toBeDefined();
  const defaultIdField: InputValueDefinitionNode | undefined = createPostInput?.fields?.find(f => f.name.value === 'id');
  expect(defaultIdField).toBeDefined();
  expect(getBaseType(defaultIdField!.type)).toEqual('ID');
});

test('DynamoDB transformer should not add default primary key when ID is defined', () => {
  const validSchema = `
  type Post @relayModel{
    id: Int
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const result = transformer.transform(validSchema);
  expect(result).toBeDefined();
  expect(result.schema).toBeDefined();
  expect(result.schema).toBeDefined();
  const schema = parse(result.schema);

  const createPostInput = schema.definitions.find(
    d => d.kind === 'InputObjectTypeDefinition' && d.name.value === 'CreatePostInput',
  ) as InputObjectTypeDefinitionNode | undefined;
  expect(createPostInput).toBeDefined();
  const defaultIdField: InputValueDefinitionNode | undefined = createPostInput?.fields?.find(f => f.name.value === 'id');
  expect(defaultIdField).toBeDefined();
  expect(getBaseType(defaultIdField!.type)).toEqual('Int');
  // It should not add default value for ctx.arg.id as id is of type Int
  expect(result.resolvers['Mutation.createPost.req.vtl']).toMatchSnapshot();
});

test('DynamoDB transformer should throw for reserved type name usage', () => {
  const invalidSchema = `
  type Subscription @relayModel{
    id: Int
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
  });
  expect(() => transformer.transform(invalidSchema)).toThrowError(
    "Subscription' is a reserved type name and currently in use within the default schema element.",
  );
});

test('Schema should compile successfully when subscription is missing from schema', () => {
  const validSchema = `
  type Post @relayModel {
    id: Int
    str: String
  }

  type Query {
    Custom: String
  }

  schema {
    query: Query
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const parsed = parse(out.schema);
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).toBeDefined();
  expectFields(subscriptionType, ['onCreatePost', 'onUpdatePost', 'onDeletePost']);
  const mutationType = getObjectType(parsed, 'Mutation');
  expect(mutationType).toBeDefined();
  expectFields(mutationType, ['createPost', 'updatePost', 'deletePost']);
});

test('Should not validate reserved type names when validateTypeNameReservedWords is off', () => {
  const schema = `
  type Subscription @relayModel{
    id: Int
    str: String
  }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags: ({
      getBoolean: jest.fn().mockImplementation(name => (name === 'validateTypeNameReservedWords' ? false : undefined)),
    } as unknown) as FeatureFlagProvider,
  });
  const out = transformer.transform(schema);
  expect(out).toBeDefined();
  const parsed = parse(out.schema);
  const subscriptionType = getObjectType(parsed, 'Subscription');
  expect(subscriptionType).toBeDefined();
});

function transformerVersionSnapshot(version: number): string {
  const validSchema = `
        type Post @relayModel
        {
          id: ID!
          content: String
        }
    `;
  const transformer = new GraphQLTransform({
    transformers: [new DynamoDBRelayModelTransformer()],
    featureFlags,
    transformConfig: {
      Version: version,
    },
  });

  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();

  return out.schema;
}

function expectFields(type: ObjectTypeDefinitionNode | undefined, fields: string[]) {
  for (const fieldName of fields) {
    const foundField = type?.fields?.find((f: FieldDefinitionNode) => f.name.value === fieldName);
    expect(foundField).toBeDefined();
  }
}

function expectFieldsOnInputType(type: InputObjectTypeDefinitionNode | undefined, fields: string[]) {
  for (const fieldName of fields) {
    const foundField = type?.fields?.find((f: InputValueDefinitionNode) => f.name.value === fieldName);
    expect(foundField).toBeDefined();
  }
}

function getFieldOnInputType(type: InputObjectTypeDefinitionNode | undefined, field: string): InputValueDefinitionNode | undefined {
  return type?.fields?.find((f: InputValueDefinitionNode) => f.name.value === field);
}

function getFieldOnObjectType(type: ObjectTypeDefinitionNode | undefined, field: string): FieldDefinitionNode | undefined {
  return type?.fields?.find((f: FieldDefinitionNode) => f.name.value === field);
}

function doNotExpectFields(type: ObjectTypeDefinitionNode | undefined, fields: string[]) {
  for (const fieldName of fields) {
    expect(type?.fields?.find((f: FieldDefinitionNode) => f.name.value === fieldName)).toBeUndefined();
  }
}

function getObjectType(doc: DocumentNode | undefined, type: string): ObjectTypeDefinitionNode | undefined {
  return doc?.definitions.find((def: DefinitionNode) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
    | ObjectTypeDefinitionNode
    | undefined;
}

function getInputType(doc: DocumentNode, type: string): InputObjectTypeDefinitionNode | undefined {
  return doc.definitions.find((def: DefinitionNode) => def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && def.name.value === type) as
    | InputObjectTypeDefinitionNode
    | undefined;
}

function verifyInputCount(doc: DocumentNode, type: string, count: number): boolean {
  return doc.definitions.filter(def => def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && def.name.value === type).length == count;
}

function verifyMatchingTypes(t1: TypeNode | undefined, t2: TypeNode | undefined): boolean {
  if (t1?.kind !== t2?.kind) {
    return false;
  }

  if (t1?.kind !== Kind.NAMED_TYPE && t2?.kind !== Kind.NAMED_TYPE) {
    verifyMatchingTypes(t1?.type, t2?.type);
    return true
  } else {
    return false;
  }
}
