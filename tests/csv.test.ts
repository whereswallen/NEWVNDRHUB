import test from "node:test";import assert from "node:assert/strict";import {csvRecords,parseCsv} from "../src/lib/csv";
test("CSV parser supports quoted commas and escaped quotes",()=>assert.deepEqual(parseCsv('name,description\n"A, B","Say ""hi"""'),[["name","description"],["A, B",'Say "hi"']]));
test("CSV headers normalize into records",()=>assert.deepEqual(csvRecords("Vendor Code,SKU\nV1,ABC"),[{vendor_code:"V1",sku:"ABC"}]));
