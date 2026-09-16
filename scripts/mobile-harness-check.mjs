import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const mobileRoot = join(root, "apps", "mobile");
const errors = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const target = join(path, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

if (!existsSync(mobileRoot)) {
  errors.push("apps/mobile is missing.");
} else {
  const app = readJson(join(mobileRoot, "app.json")).expo;
  const required = [
    ["name", app.name], ["slug", app.slug], ["scheme", app.scheme],
    ["ios.bundleIdentifier", app.ios?.bundleIdentifier],
    ["android.package", app.android?.package],
  ];
  for (const [name, value] of required) {
    if (!value) errors.push(`app.json is missing ${name}.`);
  }
  if (app.scheme !== "nyampick") errors.push("The native deep-link scheme must be nyampick.");
  if (!app.ios?.buildNumber || !app.android?.versionCode) errors.push("app.json must set iOS buildNumber and Android versionCode for release builds.");
  const imagePickerPlugin = app.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker");
  if (!imagePickerPlugin || !imagePickerPlugin[1]?.cameraPermission || !imagePickerPlugin[1]?.photosPermission) {
    errors.push("app.json must configure camera and photo permissions for expo-image-picker.");
  }
  const packageJson = readJson(join(mobileRoot, "package.json"));
  if (!packageJson.dependencies?.["expo-image-picker"]) {
    errors.push("expo-image-picker must be a mobile dependency.");
  }
  if (!packageJson.dependencies?.["expo-dev-client"]) {
    errors.push("expo-dev-client must be installed for device OAuth development builds.");
  }
  if (!packageJson.dependencies?.["expo-clipboard"]) {
    errors.push("expo-clipboard must be installed for native family invite-code copying.");
  }
  const easPath = join(mobileRoot, "eas.json");
  if (!existsSync(easPath)) {
    errors.push("apps/mobile/eas.json is missing.");
  } else {
    const eas = readJson(easPath);
    if (!eas.build?.development?.developmentClient || eas.build.development.distribution !== "internal") {
      errors.push("eas.json must configure an internal development client build.");
    }
    if (!eas.build?.["development-simulator"]?.ios?.simulator) {
      errors.push("eas.json must configure an iOS simulator development profile.");
    }
    if (eas.build?.preview?.distribution !== "internal" || !eas.build?.production?.autoIncrement) {
      errors.push("eas.json must configure internal preview and auto-incrementing production builds.");
    }
  }

  const forbidden = [
    ["browser window access", /\bwindow\./],
    ["browser document access", /\bdocument\./],
    ["browser localStorage", /\blocalStorage\b/],
    ["Next.js import", /from\s+["']next\//],
    ["web source import", /from\s+["'][^"']*(?:\.\.\/){2,}src\//],
    ["server module import", /from\s+["'][^"']*src\/lib\/server\//],
  ];
  for (const file of walk(mobileRoot)) {
    const source = readFileSync(file, "utf8");
    for (const [label, matcher] of forbidden) {
      if (matcher.test(source)) errors.push(`${relative(root, file)} uses forbidden ${label}.`);
    }
  }

  const requiredNativeFlows = [
    ["static Expo public environment access", join(mobileRoot, "src", "lib", "config.ts"), /process\.env\.EXPO_PUBLIC_API_URL[\s\S]*process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY[\s\S]*process\.env\.EXPO_PUBLIC_SUPABASE_URL/],
    ["photo picker", join(mobileRoot, "src", "lib", "photo-picker.ts"), /requestMediaLibraryPermissionsAsync/],
    ["child deletion", join(mobileRoot, "src", "features", "children", "use-children.ts"), /method:\s*"DELETE"/],
    ["family owner member unlink", join(mobileRoot, "src", "features", "family", "use-family.ts"), /requestAuthedApi\("\/api\/family"[\s\S]*method:\s*"DELETE"/],
    ["meal detail editing", join(mobileRoot, "src", "features", "meal", "use-day-meals.ts"), /const updateMeal[\s\S]*menuName, quantity: patch\.quantity/],
    ["cross-week meal navigation", join(mobileRoot, "App.tsx"), /function MealCalendar[\s\S]*movePeriod[\s\S]*"이전 주"[\s\S]*"다음 주"/],
    ["native meal-plan sharing", join(mobileRoot, "App.tsx"), /shareMealPlan[\s\S]*loadAllMeals[\s\S]*Share\.share/],
    ["meal calendar API contract", join(mobileRoot, "src", "features", "meal", "use-day-meals.ts"), /loadAllMeals[\s\S]*getAuthedApi[\s\S]*"\/api\/meals"/],
    ["fridge expiry updates", join(mobileRoot, "src", "features", "fridge", "use-fridge-items.ts"), /expiresAt: patch\.expiresAt/],
    ["active fridge search", join(mobileRoot, "App.tsx"), /function FridgeWebScreen\(\)[\s\S]*accessibilityLabel="냉장고 재료 검색"/],
    ["fridge cube category", join(mobileRoot, "App.tsx"), /type FridgeFilter = FridgeCategory \| "cube"[\s\S]*newCategory === "cube"[\s\S]*"other"/],
    ["recipe link and taste", join(mobileRoot, "src", "features", "recipes", "use-recipes.ts"), /taste: input\.taste, link: input\.link/],
    ["selectable recipe ingredients", join(mobileRoot, "App.tsx"), /openIngredientPicker[\s\S]*추천 재료 선택[\s\S]*requestRecommendation/],
    ["recipe ingredient API contract", join(mobileRoot, "src", "features", "recipes", "use-recipes.ts"), /loadFridgeIngredients[\s\S]*recommend[\s\S]*selectedIngredients/],
    ["active virtualized recipe list", join(mobileRoot, "App.tsx"), /function RecipeWebScreen\(\)[\s\S]*<FlatList[\s\S]*initialNumToRender=\{8\}/],
    ["active recipe result card identity", join(mobileRoot, "App.tsx"), /function RecipeWebScreen\(\)[\s\S]*keyExtractor=\{\(item\) => `\$\{item\.isRecommendation \? "ai" : "saved"\}:\$\{item\.id\}`\}[\s\S]*saveRecommendationItem\(recipe\.id\)/],
    ["native photo and link UI", join(mobileRoot, "App.tsx"), /pickPhotoDataUrl[\s\S]*Linking\.openURL/],
    ["family unlink confirmation", join(mobileRoot, "App.tsx"), /confirmFamilyMemberUnlink[\s\S]*Alert\.alert/],
    ["family invite-code copying", join(mobileRoot, "App.tsx"), /copyInviteCode[\s\S]*Clipboard\.setStringAsync/],
    ["account deletion confirmation", join(mobileRoot, "App.tsx"), /openDeleteAccount[\s\S]*deleteConfirmText !== "회원탈퇴"[\s\S]*회원탈퇴/],
    ["account deletion API and sign-out", join(mobileRoot, "src", "features", "auth", "auth-context.tsx"), /deleteAccount[\s\S]*requestAuthedApi[\s\S]*"\/api\/account"[\s\S]*auth\.signOut/],
    ["support and public policy links", join(mobileRoot, "App.tsx"), /openExternalUrl[\s\S]*support@nyampick\.app[\s\S]*\/privacy[\s\S]*\/terms/],
    ["native onboarding completion", join(mobileRoot, "src", "features", "auth", "auth-context.tsx"), /completeOnboarding[\s\S]*updateUser[\s\S]*onboarding_completed: true[\s\S]*refreshSession/],
    ["native onboarding UI", join(mobileRoot, "src", "features", "auth", "auth-screen.tsx"), /function OnboardingScreen[\s\S]*onboardingSlides[\s\S]*auth\.completeOnboarding/],
    ["sheet keyboard avoidance", join(mobileRoot, "App.tsx"), /function NativeSheet[\s\S]*KeyboardAvoidingView[\s\S]*keyboardDismissMode=\{Platform\.OS === "ios" \? "interactive" : "none"\}/],
  ];
  for (const [label, file, matcher] of requiredNativeFlows) {
    if (!existsSync(file) || !matcher.test(readFileSync(file, "utf8"))) {
      errors.push(`mobile ${label} flow is missing.`);
    }
  }
  const mobileConfigPath = join(mobileRoot, "src", "lib", "config.ts");
  if (existsSync(mobileConfigPath) && /process\.env\s*\[/.test(readFileSync(mobileConfigPath, "utf8"))) {
    errors.push("mobile public environment variables must use Expo static dot notation.");
  }
}

if (errors.length) {
  console.error("Mobile harness check failed:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("Mobile harness check passed.");
