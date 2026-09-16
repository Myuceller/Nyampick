import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeSource = readFileSync(
  new URL("../apps/mobile/src/theme.ts", import.meta.url),
  "utf8"
);
const authScreenSource = readFileSync(
  new URL("../apps/mobile/src/features/auth/auth-screen.tsx", import.meta.url),
  "utf8"
);
const mobileAppSource = readFileSync(
  new URL("../apps/mobile/App.tsx", import.meta.url),
  "utf8"
);

function wcagRelativeLuminance(hex: string) {
  const [red, green, blue] = hex.match(/[a-f\d]{2}/gi)!.map((channel) => Number.parseInt(channel, 16) / 255).map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

test("mobile green CTA uses a readable foreground token", () => {
  assert.match(themeSource, /green: "#57bf8e"/);
  assert.match(themeSource, /onGreen: "#1a1d1f"/);

  const green = wcagRelativeLuminance("#57bf8e");
  const foreground = wcagRelativeLuminance("#1a1d1f");
  const ratio = (Math.max(green, foreground) + 0.05) / (Math.min(green, foreground) + 0.05);
  assert.ok(ratio >= 4.5, `expected green CTA contrast >= 4.5:1, received ${ratio.toFixed(2)}:1`);
});

test("mobile authentication CTA labels and feedback use the readable foreground", () => {
  assert.match(authScreenSource, /primaryButtonText: \{ color: colors\.onGreen/);
  assert.match(authScreenSource, /requestCodeButtonText: \{ color: colors\.onGreen/);
  assert.match(authScreenSource, /onboardingNextText: \{ color: colors\.onGreen/);
  assert.match(authScreenSource, /ActivityIndicator color=\{colors\.onGreen\}/);
  assert.match(authScreenSource, /ChevronRight color=\{colors\.onGreen\}/);
  assert.doesNotMatch(authScreenSource, /ActivityIndicator color=\{colors\.surface\}/);
});

test("active mobile meal, fridge, and recipe CTAs preserve the readable foreground", () => {
  for (const styleName of [
    "childManageButtonText",
    "calendarTextSelected",
    "dateTextSelected",
    "saveMealButtonText",
    "buttonText",
    "fridgeFloatingAddText",
    "emptyPrimaryButtonText",
    "checkmarkText",
    "recipeAiCtaText",
  ]) {
    assert.match(mobileAppSource, new RegExp(`${styleName}: \\{ color: colors\\.onGreen`));
  }

  assert.doesNotMatch(mobileAppSource, /<(?:Plus|Camera|Sparkles|Pencil) color=\{colors\.surface\}/);
});

test("active mobile controls expose form labels, selection, and asynchronous errors", () => {
  assert.match(mobileAppSource, /accessibilityState=\{\{ selected \}\}/);
  assert.match(mobileAppSource, /accessibilityRole="radio" accessibilityState=\{\{ checked: newCategory === key \}\}/);
  assert.match(mobileAppSource, /accessibilityRole="radio" accessibilityState=\{\{ checked: relationshipLabel === label \}\}/);
  assert.match(mobileAppSource, /accessibilityLiveRegion="polite" accessibilityRole="alert" style=\{s\.homeErrorText\}/);
  assert.match(mobileAppSource, /accessibilityLabel="메뉴 이름"/);
  assert.match(mobileAppSource, /accessibilityLabel="재료 이름"/);
  assert.match(mobileAppSource, /accessibilityLabel="레시피 이름"/);
  assert.match(mobileAppSource, /accessibilityLabel="가족 코드"/);
});

test("mobile chips and onboarding controls meet the 44-point touch target", () => {
  assert.match(mobileAppSource, /mealTypeChip: \{ minHeight: 44/);
  assert.match(mobileAppSource, /chip: \{ minHeight: 44/);
  assert.match(authScreenSource, /onboardingDotHitTarget: \{ width: 44, minHeight: 44/);
  assert.match(authScreenSource, /onboardingSkipButton: \{ minWidth: 76, minHeight: 44/);
  assert.match(authScreenSource, /<ScrollView contentContainerStyle=\{styles\.onboardingContent\}/);
  assert.match(authScreenSource, /onboardingContent: \{ flexGrow: 1/);
});
