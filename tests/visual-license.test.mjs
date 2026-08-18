import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vendored visual code records its upstream and license", async () => {
  const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");
  const license = await readFile("src/components/vendor/react-bits/LICENSE.md", "utf8");
  assert.match(notices, /DavidHDev\/react-bits/);
  assert.match(notices, /4e0e030193b563be6be33d928f77d0d01cefe237/);
  assert.match(notices, /src\/components\/vendor\/react-bits\/LICENSE\.md/);
  assert.match(license, /^MIT \+ Commons Clause License Condition v1\.0/m);
  assert.match(license, /Copyright \(c\) 2026 David Haz/);
  assert.match(license, /Permission is hereby granted, free of charge, to any person obtaining a copy/);
  assert.match(license, /The above copyright notice and this permission notice shall be included in all/);
  assert.match(license, /## Commons Clause Restriction/);
  assert.match(license, /You may use this Software, including for any commercial purpose/);
  assert.match(license, /## No Warranty/);
  assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND/);
  for (const name of ["Shuffle", "DotGrid", "GridDistortion"]) {
    assert.match(notices, new RegExp(`src/components/vendor/react-bits/${name}/${name}\\.(tsx|css)`));
  }
});
