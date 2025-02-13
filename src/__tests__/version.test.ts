import { readFileSync } from "fs";
import { join } from "path";

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
);

describe("Package", () => {
  test("has required dependencies", () => {
    expect(pkg.dependencies).toHaveProperty("@linear/sdk");
    expect(pkg.dependencies).toHaveProperty("@modelcontextprotocol/sdk");
    expect(pkg.dependencies).toHaveProperty("dotenv");
    expect(pkg.dependencies).toHaveProperty("zod");
  });
});
