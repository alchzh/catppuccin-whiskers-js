/**
 * Copy of functions from sindresorhus/ts-extras so they can be
 * used by CommonJS output
 */

export type ObjectKeys<T extends object> = `${Exclude<keyof T, symbol>}`;

export const objectKeys = Object.keys as <Type extends object>(value: Type) => Array<ObjectKeys<Type>>;

const has = Object.prototype.hasOwnProperty;

export function objectHasOwn<ObjectType, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
): object is (ObjectType & Record<Key, unknown>) {
	// TODO: Use `Object.hasOwn()` when targeting Node.js 16.
	return has.call(object, key);
}

export const objectFromEntries = Object.fromEntries as <Key extends PropertyKey, Entries extends ReadonlyArray<readonly [Key, unknown]>>(values: Entries) => {
	[K in Extract<Entries[number], readonly [Key, unknown]>[0]]: Extract<Entries[number], readonly [K, unknown]>[1]
};

export const objectEntries = Object.entries as <Type extends Record<PropertyKey, unknown>>(value: Type) => Array<[ObjectKeys<Type>, Type[ObjectKeys<Type>]]>;

