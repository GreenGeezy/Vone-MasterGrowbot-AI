import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const strainFile = path.resolve(process.argv[2] || 'data/strains.ts');
const sourceText = fs.readFileSync(strainFile, 'utf8');
const sourceFile = ts.createSourceFile(strainFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

let databaseNode;
sourceFile.forEachChild(node => {
  if (!ts.isVariableStatement(node)) return;
  for (const declaration of node.declarationList.declarations) {
    if (declaration.name.getText(sourceFile) === 'STRAIN_DATABASE' && ts.isArrayLiteralExpression(declaration.initializer)) {
      databaseNode = declaration.initializer;
    }
  }
});

if (!databaseNode) throw new Error(`STRAIN_DATABASE array not found in ${strainFile}`);

const allowedTypes = new Set(['Indica', 'Sativa', 'Hybrid']);
const requiredFields = ['id', 'name', 'type', 'thc_level', 'cbd_level', 'most_common_terpene', 'description'];
const ids = new Map();
const names = new Map();
const errors = [];

const readStringProperty = (objectNode, field) => {
  const property = objectNode.properties.find(item =>
    ts.isPropertyAssignment(item) && item.name.getText(sourceFile).replace(/^['"]|['"]$/g, '') === field
  );
  if (!property || !ts.isPropertyAssignment(property)) return undefined;
  return ts.isStringLiteralLike(property.initializer) ? property.initializer.text.trim() : undefined;
};

databaseNode.elements.forEach((element, index) => {
  if (!ts.isObjectLiteralExpression(element)) {
    errors.push(`Entry ${index + 1} is not an object literal`);
    return;
  }

  const values = Object.fromEntries(requiredFields.map(field => [field, readStringProperty(element, field)]));
  for (const field of requiredFields) {
    if (!values[field]) errors.push(`Entry ${index + 1} (${values.name || 'unnamed'}) is missing ${field}`);
  }

  if (values.type && !allowedTypes.has(values.type)) {
    errors.push(`Entry ${index + 1} (${values.name}) has invalid type ${values.type}`);
  }

  if (values.id) {
    if (ids.has(values.id)) errors.push(`Duplicate ID: ${values.id}`);
    ids.set(values.id, index);
  }
  if (values.name) {
    const normalizedName = values.name.toLocaleLowerCase();
    if (names.has(normalizedName)) errors.push(`Duplicate normalized name: ${values.name}`);
    names.set(normalizedName, index);
  }
});

if (databaseNode.elements.length !== 300) {
  errors.push(`Expected 300 strains, found ${databaseNode.elements.length}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  file: strainFile,
  count: databaseNode.elements.length,
  duplicateIds: 0,
  duplicateNames: 0,
  missingRequiredFields: 0,
  invalidTypes: 0,
}, null, 2));
