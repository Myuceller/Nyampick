import { spawnSync } from "node:child_process";

const RELEASE_BASE = "main";
const RELEASE_HEAD = "dev";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    const message = options.capture
      ? `${command} ${args.join(" ")}\n${result.stderr || result.stdout}`
      : `${command} ${args.join(" ")}`;
    throw new Error(message.trim());
  }

  return (result.stdout || "").trim();
}

function assertCleanWorkingTree() {
  const status = run("git", ["status", "--porcelain"], { capture: true });

  if (status) {
    throw new Error(
      "릴리즈 PR 생성 전에 작업 중인 변경사항을 먼저 커밋해야 합니다.\n" + status,
    );
  }
}

function assertOnDevBranch() {
  const branch = run("git", ["branch", "--show-current"], { capture: true });

  if (branch !== RELEASE_HEAD) {
    throw new Error(
      `릴리즈 PR은 ${RELEASE_HEAD} 브랜치에서만 생성합니다. 현재 브랜치: ${branch}`,
    );
  }
}

function findExistingPr() {
  return run(
    "gh",
    [
      "pr",
      "list",
      "--base",
      RELEASE_BASE,
      "--head",
      RELEASE_HEAD,
      "--state",
      "open",
      "--json",
      "number,url",
      "--jq",
      ".[0].url // \"\"",
    ],
    { capture: true },
  );
}

function createPr() {
  const title = "Release dev to main";
  const body = [
    "## 배포 범위",
    "",
    "- dev 브랜치의 검증된 변경사항을 main으로 반영합니다.",
    "- main 병합 후 Vercel production 배포 대상입니다.",
    "",
    "## 확인",
    "",
    "- [ ] GitHub Actions CI 통과",
    "- [ ] 주요 화면 수동 확인",
  ].join("\n");

  return run(
    "gh",
    [
      "pr",
      "create",
      "--base",
      RELEASE_BASE,
      "--head",
      RELEASE_HEAD,
      "--title",
      title,
      "--body",
      body,
    ],
    { capture: true },
  );
}

try {
  console.log("릴리즈 사전 검증을 실행합니다.");
  run("npm", ["run", "release:check"]);

  assertOnDevBranch();
  assertCleanWorkingTree();

  console.log("원격 브랜치를 갱신합니다.");
  run("git", ["fetch", "origin", RELEASE_BASE, RELEASE_HEAD]);

  const existingPr = findExistingPr();

  if (existingPr) {
    console.log(`이미 열린 릴리즈 PR이 있습니다: ${existingPr}`);
  } else {
    const createdPr = createPr();
    console.log(createdPr);
  }

  console.log("PR 상태 확인 명령: gh pr checks");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
