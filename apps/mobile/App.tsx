import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import {
  CalendarDays, ChefHat, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  Camera, Copy, Heart, PackageOpen, Pencil, Plus, Refrigerator, Search, Settings, Share2, Sparkles, Trash2, UserRound,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, SectionList, Share, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@mobile/features/auth/auth-context";
import { AuthScreen, OnboardingScreen } from "@mobile/features/auth/auth-screen";
import { resolveMobileEntryScreen } from "@mobile/features/auth/mobile-entry";
import { type ChildProfile, useChildren } from "@mobile/features/children/use-children";
import { type FridgeCategory, type FridgeItem, type ReceiptCandidate, useFridgeItems } from "@mobile/features/fridge/use-fridge-items";
import { useFamily } from "@mobile/features/family/use-family";
import { type DayMeals, type MealEntry, type MealType, useHomeSummary } from "@mobile/features/home/use-home-summary";
import { getMealDayHeading, getMealShareButtonLabel, getMealShareTitle } from "@mobile/features/meal/meal-date-copy";
import { useDayMeals } from "@mobile/features/meal/use-day-meals";
import { useProfile } from "@mobile/features/profile/use-profile";
import { type RecipeIngredient, type SavedRecipe, useRecipes } from "@mobile/features/recipes/use-recipes";
import { mobileConfig } from "@mobile/lib/config";
import { pickPhotoDataUrl } from "@mobile/lib/photo-picker";
import {
  MAX_RECIPE_RECOMMENDATION_INGREDIENTS,
  MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH,
} from "@nyampick/contracts/recipe";
import { colors, font, radius } from "@mobile/theme";

type Tab = "meal" | "fridge" | "recipe" | "my";
type Icon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
type FridgeFilter = FridgeCategory | "cube";

const tabs: { id: Tab; label: string; icon: Icon }[] = [
  { id: "meal", label: "식단", icon: CalendarDays },
  { id: "fridge", label: "냉장고", icon: Refrigerator }, { id: "recipe", label: "레시피", icon: ChefHat },
  { id: "my", label: "마이페이지", icon: UserRound },
];

function Header({ title, children }: { title: string; children?: ReactNode }) {
  return <View style={s.header}><Text style={s.headerTitle}>{title}</Text><View style={s.headerAction}>{children}</View></View>;
}

function IconButton({ label, children, disabled = false, onPress }: { label: string; children: ReactNode; disabled?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.iconButton, disabled && s.disabled]}>{children}</Pressable>;
}

function Avatar({ imageUrl, small = false, square = false }: { imageUrl?: string | null; small?: boolean; square?: boolean }) {
  const style = small ? s.avatarSmall : square ? s.avatarChild : s.avatar;
  return <View style={style}>{imageUrl ? <Image accessibilityLabel="프로필 사진" source={{ uri: imageUrl }} style={s.avatarImage} /> : <UserRound color={colors.greenDeep} size={small ? 22 : square ? 32 : 30} />}</View>;
}

function Button({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.button, pressed && s.buttonPressed]}>{icon}<Text style={s.buttonText}>{label}</Text></Pressable>;
}

function ScreenScroll({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

function NativeSheet({ children, onClose, title, visible }: { children: ReactNode; onClose: () => void; title: string; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotionPreference();
  const [isMounted, setIsMounted] = useState(visible);
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let animationFrame: number | undefined;

    if (visible) {
      setIsMounted(true);
      sheetProgress.stopAnimation();
      backdropProgress.stopAnimation();
      sheetProgress.setValue(0);
      backdropProgress.setValue(0);
      animationFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        Animated.parallel([
          Animated.timing(backdropProgress, { toValue: 1, duration: reducedMotion ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(sheetProgress, { toValue: 1, duration: reducedMotion ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    } else if (isMounted) {
      const exit = Animated.parallel([
        Animated.timing(backdropProgress, { toValue: 0, duration: reducedMotion ? 0 : 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sheetProgress, { toValue: 0, duration: reducedMotion ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]);
      exit.start(({ finished }) => {
        if (finished && !cancelled) setIsMounted(false);
      });
      return () => {
        cancelled = true;
        exit.stop();
      };
    }

    return () => {
      cancelled = true;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      sheetProgress.stopAnimation();
      backdropProgress.stopAnimation();
    };
  }, [backdropProgress, isMounted, reducedMotion, sheetProgress, visible]);

  if (!isMounted) return null;

  return <Modal animationType="none" onRequestClose={onClose} transparent visible={isMounted}>
    <Animated.View pointerEvents={visible ? "auto" : "none"} style={[s.sheetScrim, { opacity: backdropProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]}><Pressable accessibilityRole="button" accessibilityLabel="시트 닫기" onPress={onClose} style={s.sheetScrimPressable} /></Animated.View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top} pointerEvents={visible ? "auto" : "none"} style={s.sheetKeyboard}>
      <Animated.View accessibilityViewIsModal style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 24), transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}><View style={s.sheetHandle} /><View style={s.sheetHeader}><Text style={s.sheetTitle}>{title}</Text><IconButton label="닫기" onPress={onClose}><Text style={s.sheetClose}>닫기</Text></IconButton></View><ScrollView contentContainerStyle={s.sheetScrollContent} keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView></Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onPress} style={s.sectionAction}><Text style={s.sectionActionText}>{action}</Text><ChevronRight color={colors.green} size={16} /></Pressable> : null}</View>;
}

function RecipeIssueNotice({
  message,
  onRetry,
  retryLabel,
  title = "레시피를 준비하지 못했어요.",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}) {
  return <View style={s.homeError}>
    <Text style={s.homeErrorTitle}>{title}</Text>
    <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{message}</Text>
    {onRetry && retryLabel ? <Pressable accessibilityRole="button" onPress={onRetry} style={s.retryButton}><Text style={s.retryButtonText}>{retryLabel}</Text></Pressable> : null}
  </View>;
}

function RecipeSuccessNotice({ message }: { message: string }) {
  return <View accessibilityLiveRegion="polite" style={s.recipeSuccessNotice}>
    <Text style={s.recipeSuccessNoticeText}>{message}</Text>
  </View>;
}

function isRecommendationIngredientNameTooLong(name: string) {
  return [...name.trim().replace(/\s+/g, " ")].length > MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH;
}

function getRecommendationIngredientLengthMessage() {
  return `재료 이름은 ${MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH}자 이하로 선택할 수 있어요.`;
}

function MealCard({ label, menu, detail, onPress }: { label: string; menu: string; detail: string; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.mealCard, pressed && s.cardPressed]}>
    <View style={s.mealTop}><View style={s.badge}><Text style={s.badgeText}>{label}</Text></View><ChevronRight color={colors.tertiary} size={20} /></View>
    <Text style={s.mealName}>{menu}</Text><Text style={s.caption}>{detail}</Text>
  </Pressable>;
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const mealLabels: Record<MealType, string> = { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" };

function getBabyFoodDayLabel(startedOn?: string | null) {
  if (!startedOn) return "이유식 시작일 미설정";
  const start = new Date(`${startedOn}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "이유식 시작일 미설정";
  const today = new Date();
  const days = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86_400_000) + 1;
  return days < 1 ? "이유식 시작 예정" : `이유식 시작 D+${days}`;
}

function mealMarkerCount(day?: DayMeals) {
  if (!day) return 0;
  return mealTypes.filter((type) => day[type].length > 0).length;
}

function MealCalendar({ meals, onChange, onOverview, selectedDate }: { meals: Record<string, DayMeals>; onChange: (date: string) => void; onOverview: () => void; selectedDate: string }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const selected = new Date(`${selectedDate}T00:00:00`);
  const today = dateKey(new Date());
  const mondayStart = new Date(selected);
  mondayStart.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(mondayStart);
    date.setDate(mondayStart.getDate() + index);
    return date;
  });
  const firstDay = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: Math.ceil((leadingDays + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day > 0 && day <= daysInMonth ? new Date(selected.getFullYear(), selected.getMonth(), day) : null;
  });
  const days = mode === "week" ? weekDays : monthDays;
  const weekdayLabel = ["월", "화", "수", "목", "금", "토", "일"];
  const calendarTitle = mode === "week" ? `${mondayStart.getMonth() + 1}월 ${mondayStart.getDate()}일 주` : `${selected.getFullYear()}년 ${selected.getMonth() + 1}월`;
  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(selected);
    if (mode === "week") next.setDate(next.getDate() + direction * 7);
    else {
      const targetMonth = next.getMonth() + direction;
      const targetYear = next.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const targetDays = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      next.setFullYear(targetYear, normalizedMonth, Math.min(next.getDate(), targetDays));
    }
    onChange(dateKey(next));
  };
  return <View style={s.mealCalendarCard}>
    <View style={s.mealCalendarHeader}><Text style={s.mealCalendarTitle}>{calendarTitle}</Text><View style={s.mealCalendarHeaderActions}><Pressable accessibilityRole="button" accessibilityLabel={mode === "week" ? "이전 주" : "이전 달"} onPress={() => movePeriod(-1)} style={s.calendarModeButton}><ChevronLeft color={colors.foreground} size={22} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="캘린더 보기 전환" onPress={() => setMode((current) => current === "week" ? "month" : "week")} style={s.calendarModeButton}><CalendarDays color={colors.foreground} size={21} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={mode === "week" ? "다음 주" : "다음 달"} onPress={() => movePeriod(1)} style={s.calendarModeButton}><ChevronRight color={colors.foreground} size={22} /></Pressable></View></View>
    {mode === "month" ? <View style={s.monthWeekdayRow}>{weekdayLabel.map((label) => <Text key={label} style={s.monthWeekday}>{label}</Text>)}</View> : null}
    <View style={mode === "week" ? s.weekCalendarRow : s.monthCalendarGrid}>{days.map((day, index) => {
      if (!day) return <View key={`blank-${index}`} style={s.monthCalendarBlank} />;
      const key = dateKey(day);
      const isSelected = key === selectedDate;
      const isToday = key === today;
      const markers = mealMarkerCount(meals[key]);
      return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => onChange(key)} style={[mode === "week" ? s.weekCalendarDay : s.monthCalendarDay, isSelected && s.calendarDaySelected, !isSelected && isToday && s.calendarDayToday]}>
        {mode === "week" ? <Text style={[s.calendarWeekday, isSelected && s.calendarTextSelected]}>{weekdayLabel[index]}</Text> : null}
        <Text style={[s.calendarDate, isSelected && s.calendarTextSelected]}>{day.getDate()}</Text>
        <View style={mode === "week" ? s.weekMarkerStack : s.monthMarkerRow}>{Array.from({ length: mode === "week" ? 3 : markers }, (_, marker) => <View key={marker} style={[mode === "week" ? s.weekMarker : s.monthMarker, marker < markers && (isSelected ? s.markerSelected : s.markerActive)]} />)}</View>
      </Pressable>;
    })}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="식단표 전체보기" onPress={onOverview} style={s.mealOverviewButton}><Text style={s.mealOverviewText}>전체보기</Text></Pressable>
  </View>;
}

function MealSectionCard({ entries, label, onPress }: { entries: MealEntry[]; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.webMealCard, pressed && s.cardPressed]}>
    <Text style={s.webMealCardTitle}>{label}</Text>
    {entries.length ? <View style={s.webMealEntries}>{entries.map((entry) => <View key={entry.id} style={s.webMealEntry}><Text style={s.webMealEntryName}>{entry.menuName}</Text>{entry.reaction === "loved" ? <Heart color="#ff3848" fill="#ff3848" size={18} /> : null}</View>)}</View> : <Text style={s.webMealEmpty}>아직 식단이 준비되지 않았습니다</Text>}
  </Pressable>;
}

function MealScreen({ onManageChild }: { onManageChild: () => void }) {
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const { error, isLoading: isHomeLoading, refresh: refreshHome, summary } = useHomeSummary();
  const { addMeal, date, error: mealError, isLoading, isSaving, loadAllMeals, meals: dayMeals, refresh, removeMeal, updateMeal, updateReaction } = useDayMeals(selectedDate);
  const [isAdding, setIsAdding] = useState(false);
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [menuName, setMenuName] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ entry: MealEntry; mealType: MealType } | null>(null);
  const [editingMealName, setEditingMealName] = useState("");
  const [editingMealQuantity, setEditingMealQuantity] = useState("");
  const [editingMealMemo, setEditingMealMemo] = useState("");
  const [isMealShareOpen, setIsMealShareOpen] = useState(false);
  const [isSharingMeals, setIsSharingMeals] = useState(false);
  const [shareMealError, setShareMealError] = useState<string | null>(null);
  const pageError = mealError ?? error;
  const save = async () => {
    try {
      await addMeal(mealType, menuName);
      setMenuName("");
      setIsAdding(false);
      void refreshHome();
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const openMealEditor = (mealType: MealType, entry: MealEntry) => {
    setEditingMeal({ entry, mealType });
    setEditingMealName(entry.menuName);
    setEditingMealQuantity(entry.quantity ?? "");
    setEditingMealMemo(entry.memo ?? "");
  };
  const saveMealDetails = async () => {
    if (!editingMeal) return;
    try {
      await updateMeal(editingMeal.mealType, editingMeal.entry.id, { menuName: editingMealName, quantity: editingMealQuantity, memo: editingMealMemo });
      setEditingMeal(null);
      void refreshHome();
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const formatMealPlanDay = (day: DayMeals, dayDate: Date) => {
    const dateLabel = dayDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    const mealLines = mealTypes.map((type) => `${mealLabels[type]}: ${day[type].length ? day[type].map((entry) => `${entry.menuName}${entry.quantity ? ` (${entry.quantity})` : ""}`).join(", ") : "-"}`);
    return `${dateLabel}\n${mealLines.join("\n")}`;
  };
  const shareMealPlan = async (scope: "day" | "week") => {
    try {
      setIsSharingMeals(true);
      setShareMealError(null);
      let message = "";
      if (scope === "day") {
        message = `[${getMealShareTitle(date)}]\n\n${formatMealPlanDay(dayMeals, new Date(`${date}T00:00:00`))}`;
      } else {
        const allMeals = await loadAllMeals();
        const selected = new Date(`${date}T00:00:00`);
        const weekStart = new Date(selected);
        weekStart.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
        const days = Array.from({ length: 7 }, (_, index) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + index);
          const key = dateKey(dayDate);
          return formatMealPlanDay(allMeals[key] ?? { date: key, breakfast: [], lunch: [], dinner: [], snack: [] }, dayDate);
        });
        message = `[냠픽 일주일 식단표]\n\n${days.join("\n\n")}`;
      }
      await Share.share({ message, title: scope === "day" ? getMealShareTitle(date) : "냠픽 일주일 식단표" });
      setIsMealShareOpen(false);
    } catch (caught) {
      setShareMealError(caught instanceof Error ? caught.message : "식단표를 공유하지 못했습니다.");
    } finally {
      setIsSharingMeals(false);
    }
  };
  const child = summary?.primaryChild;
  return <ScreenScroll>
    <View style={s.mealHomeHero}>
      <View style={s.mealHomeHeader}><View><Text style={s.mealGreeting}>안녕하세요</Text><Text style={s.mealHomeTitle}>{child ? `${child.name}의 식단` : "식단"}</Text></View><IconButton label="식단표 공유" onPress={() => { setShareMealError(null); setIsMealShareOpen(true); }}><Share2 color={colors.foreground} size={21} /></IconButton></View>
      <Pressable accessibilityRole="button" onPress={onManageChild} style={s.childSummaryCard}>
        <Avatar imageUrl={child?.photoUrl} square /><View style={s.flex}><Text style={s.childSummaryName}>{child?.name ?? "이름 미설정"}</Text><Text style={s.childSummaryMeta}>{child ? `생후 ${child.monthsOld}개월` : "아이 정보를 등록해주세요"}</Text>{child ? <Text style={s.childSummaryDay}>{getBabyFoodDayLabel(child.babyFoodStartedOn)}</Text> : null}</View><View style={s.childManageButton}><Text style={s.childManageButtonText}>아기 관리</Text></View>
      </Pressable>
      {isHomeLoading ? <View style={s.mealProfileLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>식단 정보를 불러오고 있어요.</Text></View> : <MealCalendar meals={summary?.meals ?? {}} onChange={setSelectedDate} onOverview={() => { setShareMealError(null); setIsMealShareOpen(true); }} selectedDate={date} />}
    </View>
    <View style={s.mealHomeBody}>
      <View style={s.mealDayHeader}><View><Text style={s.mealSelectedDate}>{new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</Text><Text style={s.mealDayTitle}>{getMealDayHeading(date)}</Text></View><IconButton label="식단 수정" onPress={() => setIsAdding(true)}><Pencil color={colors.foreground} size={25} /></IconButton></View>
      {pageError ? <View style={s.homeError}><Text style={s.homeErrorTitle}>식단을 불러오지 못했어요.</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{pageError}</Text><Pressable onPress={() => { void refresh(); void refreshHome(); }} style={s.retryButton}><Text style={s.retryButtonText}>다시 시도</Text></Pressable></View> : null}
      {isLoading ? <View style={s.mealCardsLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>식단을 불러오고 있어요.</Text></View> : <View style={s.webMealStack}>{mealTypes.map((type) => <MealSectionCard key={type} entries={dayMeals[type]} label={mealLabels[type]} onPress={() => { if (dayMeals[type].length) setSelectedMealType(type); else { setMealType(type); setIsAdding(true); } }} />)}</View>}
    </View>
    <NativeSheet onClose={() => setIsAdding(false)} title="메뉴 추가" visible={isAdding}><View style={s.sheetContent}><Text style={s.inputLabel}>끼니</Text><View style={s.mealTypeRow}>{mealTypes.map((type) => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: mealType === type }} onPress={() => setMealType(type)} style={[s.mealTypeChip, mealType === type && s.mealTypeChipSelected]}><Text style={[s.mealTypeChipText, mealType === type && s.mealTypeChipTextSelected]}>{mealLabels[type]}</Text></Pressable>)}</View><Text style={s.inputLabel}>메뉴 이름</Text><TextInput accessibilityLabel="메뉴 이름" onChangeText={setMenuName} placeholder="메뉴 이름을 입력해주세요" placeholderTextColor={colors.tertiary} style={s.mealInput} value={menuName} /><Pressable disabled={isSaving || !menuName.trim()} onPress={() => void save()} style={[s.saveMealButton, (isSaving || !menuName.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "식단 저장"}</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => setSelectedMealType(null)} title={selectedMealType ? `${mealLabels[selectedMealType]} 식단` : "식단"} visible={Boolean(selectedMealType)}>
      <View style={s.sheetContent}>{selectedMealType && dayMeals[selectedMealType].length ? dayMeals[selectedMealType].map((entry) => <View key={entry.id} style={s.sheetListItem}><View style={s.flex}><Text style={s.ingredientName}>{entry.menuName}</Text><Text style={s.caption}>{[entry.quantity, entry.memo, entry.reaction === "loved" ? "잘 먹었어요" : entry.reaction === "disliked" ? "잘 먹지 않았어요" : "반응 미기록"].filter(Boolean).join(" · ")}</Text></View><View style={s.sheetActions}><Pressable accessibilityLabel="식단 수정" onPress={() => openMealEditor(selectedMealType, entry)} style={s.sheetIconButton}><Pencil color={colors.greenDeep} size={18} /></Pressable><Pressable accessibilityLabel="잘 먹었어요" onPress={() => { void updateReaction(selectedMealType, entry.id, "loved").then(() => refreshHome()).catch(() => undefined); }} style={[s.sheetIconButton, entry.reaction === "loved" && s.sheetIconButtonSelected]}><Heart color={entry.reaction === "loved" ? colors.onGreen : colors.greenDeep} fill={entry.reaction === "loved" ? colors.onGreen : "transparent"} size={18} /></Pressable><Pressable accessibilityLabel="식단 삭제" onPress={() => { void removeMeal(selectedMealType, entry.id).then(() => refreshHome()).catch(() => undefined); }} style={s.sheetIconButton}><Trash2 color="#b91c1c" size={18} /></Pressable></View></View>) : <View style={s.emptyCard}><Text style={s.emptyTitle}>아직 기록된 메뉴가 없어요.</Text><Text style={s.caption}>아래 버튼에서 메뉴를 추가해 보세요.</Text></View>}<Button label="메뉴 추가" onPress={() => { if (selectedMealType) setMealType(selectedMealType); setIsAdding(true); setSelectedMealType(null); }} icon={<Plus color={colors.onGreen} size={20} />} /></View>
    </NativeSheet>
    <NativeSheet onClose={() => setEditingMeal(null)} title="식단 수정" visible={Boolean(editingMeal)}><View style={s.sheetContent}><Text style={s.inputLabel}>메뉴 이름</Text><TextInput accessibilityLabel="메뉴 이름" onChangeText={setEditingMealName} placeholder="메뉴 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingMealName} /><Text style={[s.inputLabel, s.secondaryInput]}>수량</Text><TextInput accessibilityLabel="수량" onChangeText={setEditingMealQuantity} placeholder="예: 2개, 한 그릇 (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingMealQuantity} /><Text style={[s.inputLabel, s.secondaryInput]}>메모</Text><TextInput accessibilityLabel="식단 메모" multiline onChangeText={setEditingMealMemo} placeholder="식단 메모 (선택)" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={editingMealMemo} /><Pressable disabled={isSaving || !editingMealName.trim()} onPress={() => void saveMealDetails()} style={[s.saveMealButton, (isSaving || !editingMealName.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "수정 저장"}</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => { if (!isSharingMeals) setIsMealShareOpen(false); }} title="식단표 공유" visible={isMealShareOpen}><View style={s.sheetContent}><Text style={s.caption}>기기 기본 공유 시트에서 가족에게 식단표를 보낼 수 있어요.</Text>{shareMealError ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.formError, s.secondaryInput]}>{shareMealError}</Text> : null}<Pressable disabled={isSharingMeals} onPress={() => void shareMealPlan("day")} style={[s.saveMealButton, isSharingMeals && s.disabled]}><Text style={s.saveMealButtonText}>{isSharingMeals ? "공유 시트를 여는 중" : getMealShareButtonLabel(date)}</Text></Pressable><Pressable disabled={isSharingMeals} onPress={() => void shareMealPlan("week")} style={[s.secondaryActionButton, s.fullWidthAction, isSharingMeals && s.disabled]}><Text style={s.secondaryActionText}>일주일 식단표 공유</Text></Pressable></View></NativeSheet>
  </ScreenScroll>;
}

function FridgeScreen() {
  const [category, setCategory] = useState<FridgeFilter | undefined>();
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newCategory, setNewCategory] = useState<FridgeFilter>("vegetable");
  const [selectedItem, setSelectedItem] = useState<FridgeItem | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingExpiresAt, setEditingExpiresAt] = useState("");
  const [receiptScanId, setReceiptScanId] = useState<string | null>(null);
  const [receiptCandidates, setReceiptCandidates] = useState<ReceiptCandidate[]>([]);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const { addItem, confirmReceipt, error, isLoading, isSaving, items, refresh, removeItem, scanReceipt, updateItem } = useFridgeItems();
  const categoryLabels: Record<FridgeCategory, string> = { fruit: "과일", vegetable: "채소", protein: "단백질", dairy: "유제품", grain: "곡류", sauce: "소스", snack: "간식", other: "기타" };
  const filterLabels: Record<FridgeFilter, string> = { cube: "큐브 이유식", ...categoryLabels };
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleItems = items.filter((item) => (!category || (category === "cube" ? item.name.includes("큐브") : item.category === category)) && (!normalizedQuery || item.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery)));
  const save = async () => {
    try {
      const savedName = newCategory === "cube" && !name.trim().includes("큐브") ? `${name.trim()} 큐브` : name;
      await addItem(savedName, quantity, newCategory === "cube" ? "other" : newCategory, expiresAt);
      setName("");
      setQuantity("");
      setExpiresAt("");
      setIsAdding(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const processReceiptAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset | undefined) => {
    try {
      setIsScanningReceipt(true);
      setReceiptError(null);
      if (!asset?.base64) throw new Error("영수증 사진을 읽지 못했습니다.");
      const imageDataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
      const scanned = await scanReceipt(imageDataUrl, asset.fileName ?? "receipt.jpg");
      if (!scanned.candidates.length) throw new Error("인식된 재료가 없어요. 영수증 전체가 보이도록 다시 촬영해주세요.");
      setReceiptScanId(scanned.scanId);
      setReceiptCandidates(scanned.candidates);
      setSelectedReceiptIds(new Set(scanned.candidates.map((item) => item.tempId)));
    } catch (caught) {
      setReceiptError(caught instanceof Error ? caught.message : "영수증을 분석하지 못했습니다.");
    } finally {
      setIsScanningReceipt(false);
    }
  }, [scanReceipt]);
  useEffect(() => {
    let isMounted = true;
    const restorePendingCameraResult = async () => {
      const pending = await ImagePicker.getPendingResultAsync();
      if (!isMounted || !pending) return;
      if (!("canceled" in pending)) {
        setReceiptError(pending.message || "영수증 촬영 결과를 복구하지 못했습니다.");
        return;
      }
      if (!pending.canceled) await processReceiptAsset(pending.assets[0]);
    };
    void restorePendingCameraResult();
    return () => { isMounted = false; };
  }, [processReceiptAsset]);
  const captureReceipt = async () => {
    if (isScanningReceipt || isSaving) return;
    try {
      setIsScanningReceipt(true);
      setReceiptError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("영수증을 촬영하려면 카메라 접근을 허용해주세요.");
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
      if (result.canceled) return;
      await processReceiptAsset(result.assets[0]);
    } catch (caught) {
      setReceiptError(caught instanceof Error ? caught.message : "영수증을 분석하지 못했습니다.");
    } finally {
      setIsScanningReceipt(false);
    }
  };
  const saveReceiptCandidates = async () => {
    if (!receiptScanId) return;
    try {
      await confirmReceipt(receiptScanId, receiptCandidates.filter((item) => selectedReceiptIds.has(item.tempId)));
      setReceiptScanId(null);
      setReceiptCandidates([]);
      setSelectedReceiptIds(new Set());
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  return <>
    <FlatList contentContainerStyle={s.listContent} data={isLoading ? [] : visibleItems} initialNumToRender={12} keyExtractor={(item) => item.id} ListEmptyComponent={isLoading ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>재료를 불러오고 있어요.</Text></View> : <View style={s.emptyCard}><Text style={s.emptyTitle}>{normalizedQuery || category ? "찾으시는 재료가 없어요." : "등록한 재료가 없어요."}</Text><Text style={s.caption}>{normalizedQuery || category ? "검색어 또는 분류를 바꾸거나 재료를 직접 추가해 보세요." : "재료를 추가하면 AI 레시피를 추천해드려요."}</Text></View>} ListHeaderComponent={<><Header title="냉장고"><View style={s.headerIconRow}><IconButton disabled={isScanningReceipt || isSaving} label="영수증 스캔" onPress={() => void captureReceipt()}><Camera color={colors.foreground} size={21} /></IconButton><IconButton label="재료 추가" onPress={() => setIsAdding((current) => !current)}><Plus color={colors.foreground} size={22} /></IconButton></View></Header><View style={s.fridgeIntro}><View><Text style={s.fridgeTitle}>냉장고에 <Text style={s.greenText}>{items.length}가지</Text> 있어요.</Text><Text style={s.heroDescription}>보관 중인 재료를 관리해 보세요.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="영수증 스캔" disabled={isScanningReceipt || isSaving} onPress={() => void captureReceipt()} style={[s.addButton, (isScanningReceipt || isSaving) && s.disabled]}><Camera color={colors.onGreen} size={21} /></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroller} contentContainerStyle={s.chips}><Chip label={`전체 ${items.length}`} onPress={() => setCategory(undefined)} selected={!category} />{(Object.keys(filterLabels) as FridgeFilter[]).map((key) => <Chip key={key} label={filterLabels[key]} onPress={() => setCategory(key)} selected={category === key} />)}</ScrollView><View style={s.searchField}><Search color={colors.tertiary} size={20} /><TextInput accessibilityLabel="냉장고 재료 검색" autoCapitalize="none" onChangeText={setQuery} placeholder="재료 이름으로 검색" placeholderTextColor={colors.tertiary} style={s.searchInput} value={query} /></View>{isAdding ? <View style={s.addMealCard}><Text style={s.addMealTitle}>재료 추가</Text><TextInput onChangeText={setName} placeholder="재료 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={name} /><Text style={[s.inputLabel, s.secondaryInput]}>분류</Text><View style={s.categoryChipRow}>{(Object.keys(filterLabels) as FridgeFilter[]).map((key) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: newCategory === key }} onPress={() => setNewCategory(key)} style={[s.mealTypeChip, newCategory === key && s.mealTypeChipSelected]}><Text style={[s.mealTypeChipText, newCategory === key && s.mealTypeChipTextSelected]}>{filterLabels[key]}</Text></Pressable>)}</View>{newCategory === "cube" ? <Text style={s.caption}>큐브 이유식은 기타 분류에 저장되며 이름에 큐브를 붙여 관리해요.</Text> : null}<TextInput accessibilityLabel="수량" onChangeText={setQuantity} placeholder="수량 (선택)" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={quantity} /><TextInput accessibilityLabel="소비기한" autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setExpiresAt} placeholder="소비기한 YYYY-MM-DD (선택)" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={expiresAt} /><Pressable disabled={isSaving || !name.trim()} onPress={() => void save()} style={[s.saveMealButton, (isSaving || !name.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "재료 저장"}</Text></Pressable></View> : null}{isScanningReceipt ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>영수증을 분석하고 있어요.</Text></View> : null}{(error || receiptError) ? <View style={s.homeError}><Text style={s.homeErrorTitle}>{receiptError ? "영수증을 준비하지 못했어요." : "냉장고를 불러오지 못했어요."}</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{error ?? receiptError}</Text><Pressable onPress={() => { if (receiptError) { setReceiptError(null); void captureReceipt(); } else void refresh(); }} style={s.retryButton}><Text style={s.retryButtonText}>{receiptError ? "다시 촬영" : "다시 시도"}</Text></Pressable></View> : null}{visibleItems.length > 0 ? <View style={s.listCardTop} /> : null}</>} renderItem={({ item, index }) => <Pressable accessibilityRole="button" onPress={() => { setSelectedItem(item); setEditingName(item.name); setEditingQuantity(item.quantity ?? ""); setEditingExpiresAt(item.expiresAt ?? ""); }} style={[s.ingredient, s.listCardMiddle, index < visibleItems.length - 1 && s.divider]}><View style={s.ingredientIcon}><PackageOpen color={colors.greenDeep} size={20} /></View><View style={s.flex}><Text style={s.ingredientName}>{item.name}</Text><Text style={s.caption}>{item.quantity ?? categoryLabels[item.category]}</Text></View><Text style={[s.due, item.expiresAt && s.dueUrgent]}>{item.expiresAt ? `${item.expiresAt}까지` : "기한 미입력"}</Text><ChevronRight color={colors.tertiary} size={18} /></Pressable>} ListFooterComponent={visibleItems.length > 0 ? <View style={s.listCardBottom} /> : null} />
    <NativeSheet onClose={() => setSelectedItem(null)} title="재료 관리" visible={Boolean(selectedItem)}>
      <View style={s.sheetContent}><Text style={s.inputLabel}>재료 이름</Text><TextInput accessibilityLabel="재료 이름" onChangeText={setEditingName} placeholder="재료 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingName} /><Text style={[s.inputLabel, s.secondaryInput]}>수량</Text><TextInput accessibilityLabel="수량" onChangeText={setEditingQuantity} placeholder="수량 (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingQuantity} /><Text style={[s.inputLabel, s.secondaryInput]}>소비기한</Text><TextInput accessibilityLabel="소비기한" autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setEditingExpiresAt} placeholder="YYYY-MM-DD (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingExpiresAt} /><Pressable disabled={isSaving || !editingName.trim()} onPress={() => { if (selectedItem) void updateItem(selectedItem.id, { name: editingName, quantity: editingQuantity, expiresAt: editingExpiresAt }); }} style={[s.saveMealButton, (isSaving || !editingName.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "수정 저장"}</Text></Pressable><Pressable disabled={isSaving} onPress={() => { if (selectedItem) { void removeItem(selectedItem.id); setSelectedItem(null); } }} style={s.deleteButton}><Trash2 color="#b91c1c" size={18} /><Text style={s.deleteButtonText}>재료 삭제</Text></Pressable></View>
    </NativeSheet>
    <NativeSheet onClose={() => { setReceiptScanId(null); setReceiptCandidates([]); }} title="영수증 재료 확인" visible={Boolean(receiptScanId)}><View style={s.sheetContent}><Text style={s.caption}>추가할 재료를 선택한 뒤 냉장고에 저장하세요.</Text>{receiptCandidates.map((candidate) => { const selected = selectedReceiptIds.has(candidate.tempId); return <Pressable key={candidate.tempId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedReceiptIds((current) => { const next = new Set(current); if (next.has(candidate.tempId)) next.delete(candidate.tempId); else next.add(candidate.tempId); return next; })} style={[s.receiptCandidate, selected && s.childRowSelected]}><View style={[s.checkmark, selected && s.checkmarkSelected]}><Text style={s.checkmarkText}>{selected ? "✓" : ""}</Text></View><View style={s.flex}><Text style={s.ingredientName}>{candidate.name}</Text><Text style={s.caption}>{categoryLabels[candidate.category]}</Text></View></Pressable>; })}<Pressable disabled={isSaving || selectedReceiptIds.size === 0} onPress={() => void saveReceiptCandidates()} style={[s.saveMealButton, (isSaving || selectedReceiptIds.size === 0) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : `${selectedReceiptIds.size}개 재료 추가`}</Text></Pressable></View></NativeSheet>
  </>;
}

function FridgeWebScreen() {
  const [category, setCategory] = useState<FridgeFilter | undefined>();
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newCategory, setNewCategory] = useState<FridgeFilter>("vegetable");
  const [selectedItem, setSelectedItem] = useState<FridgeItem | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingExpiresAt, setEditingExpiresAt] = useState("");
  const [receiptScanId, setReceiptScanId] = useState<string | null>(null);
  const [receiptCandidates, setReceiptCandidates] = useState<ReceiptCandidate[]>([]);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const { addItem, confirmReceipt, error, isLoading, isSaving, items, refresh, removeItem, scanReceipt, updateItem } = useFridgeItems();
  const categoryLabels: Record<FridgeCategory, string> = { fruit: "과일", vegetable: "채소", protein: "단백질", dairy: "유제품", grain: "곡류", sauce: "소스", snack: "간식", other: "기타" };
  const filterLabels: Record<FridgeFilter, string> = { cube: "큐브 이유식", ...categoryLabels };
  const sectionOrder: FridgeFilter[] = ["cube", "protein", "vegetable", "fruit", "dairy", "grain", "sauce", "snack", "other"];
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleItems = items.filter((item) => (!category || (category === "cube" ? item.name.includes("큐브") : item.category === category)) && (!normalizedQuery || item.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery)));
  const sections = useMemo(() => sectionOrder.map((key) => ({
    key,
    title: filterLabels[key],
    data: visibleItems.filter((item) => key === "cube" ? item.name.includes("큐브") : item.category === key && !(key === "other" && item.name.includes("큐브"))),
  })).filter((section) => section.data.length > 0), [filterLabels, visibleItems]);
  const save = async () => {
    const names = name.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    if (!names.length) return;
    try {
      for (const rawName of names) {
        const savedName = newCategory === "cube" && !rawName.includes("큐브") ? `${rawName} 큐브` : rawName;
        await addItem(savedName, quantity, newCategory === "cube" ? "other" : newCategory, expiresAt);
      }
      setName("");
      setQuantity("");
      setExpiresAt("");
      setIsAdding(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const processReceiptAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset | undefined) => {
    try {
      setIsScanningReceipt(true);
      setReceiptError(null);
      if (!asset?.base64) throw new Error("영수증 사진을 읽지 못했습니다.");
      const imageDataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
      const scanned = await scanReceipt(imageDataUrl, asset.fileName ?? "receipt.jpg");
      if (!scanned.candidates.length) throw new Error("인식된 재료가 없어요. 영수증 전체가 보이도록 다시 촬영해주세요.");
      setReceiptScanId(scanned.scanId);
      setReceiptCandidates(scanned.candidates);
      setSelectedReceiptIds(new Set(scanned.candidates.map((item) => item.tempId)));
    } catch (caught) {
      setReceiptError(caught instanceof Error ? caught.message : "영수증을 분석하지 못했습니다.");
    } finally {
      setIsScanningReceipt(false);
    }
  }, [scanReceipt]);
  useEffect(() => {
    let isMounted = true;
    const restorePendingCameraResult = async () => {
      const pending = await ImagePicker.getPendingResultAsync();
      if (!isMounted || !pending) return;
      if (!("canceled" in pending)) {
        setReceiptError(pending.message || "영수증 촬영 결과를 복구하지 못했습니다.");
        return;
      }
      if (!pending.canceled) await processReceiptAsset(pending.assets[0]);
    };
    void restorePendingCameraResult();
    return () => { isMounted = false; };
  }, [processReceiptAsset]);
  const captureReceipt = async () => {
    if (isScanningReceipt || isSaving) return;
    try {
      setIsScanningReceipt(true);
      setReceiptError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("영수증을 촬영하려면 카메라 접근을 허용해주세요.");
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
      if (result.canceled) return;
      await processReceiptAsset(result.assets[0]);
    } catch (caught) {
      setReceiptError(caught instanceof Error ? caught.message : "영수증을 분석하지 못했습니다.");
    } finally {
      setIsScanningReceipt(false);
    }
  };
  const saveReceiptCandidates = async () => {
    if (!receiptScanId) return;
    try {
      await confirmReceipt(receiptScanId, receiptCandidates.filter((item) => selectedReceiptIds.has(item.tempId)));
      setReceiptScanId(null);
      setReceiptCandidates([]);
      setSelectedReceiptIds(new Set());
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  return <View style={s.fridgeScreen}>
    <View style={s.fridgeFixedHeader}>
      <View style={s.fridgePageTitleRow}><Text style={s.fridgePageTitle}>내 냉장고</Text><Pressable accessibilityRole="button" disabled={isScanningReceipt || isSaving} onPress={() => void captureReceipt()} style={s.fridgeHeaderAction}><Text style={s.fridgeHeaderActionText}>{isScanningReceipt ? "분석 중" : "영수증 스캔"}</Text></Pressable></View>
      <View style={s.webSearchField}><Search color="#9aa39f" size={24} /><TextInput accessibilityLabel="냉장고 재료 검색" autoCapitalize="none" onChangeText={setQuery} placeholder="재료 검색" placeholderTextColor="#9aa39f" style={s.webSearchInput} value={query} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.webCategoryChips}><Chip label="전체" onPress={() => setCategory(undefined)} selected={!category} />{sectionOrder.map((key) => <Chip key={key} label={filterLabels[key]} onPress={() => setCategory(key)} selected={category === key} />)}</ScrollView>
    </View>
    <SectionList contentContainerStyle={s.fridgeSectionContent} sections={isLoading ? [] : sections} keyExtractor={(item) => item.id} stickySectionHeadersEnabled={false} initialNumToRender={12} ListHeaderComponent={isScanningReceipt ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>영수증을 분석하고 있어요.</Text></View> : (error || receiptError) ? <View style={s.homeError}><Text style={s.homeErrorTitle}>{receiptError ? "영수증을 준비하지 못했어요." : "냉장고를 불러오지 못했어요."}</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{error ?? receiptError}</Text><Pressable onPress={() => { if (receiptError) { setReceiptError(null); void captureReceipt(); } else void refresh(); }} style={s.retryButton}><Text style={s.retryButtonText}>{receiptError ? "다시 촬영" : "다시 시도"}</Text></Pressable></View> : null} ListEmptyComponent={isLoading ? <View style={s.webEmptyFridge}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>냉장고를 불러오고 있어요.</Text></View> : <View style={s.webEmptyFridge}><Text style={s.webEmptyFridgeTitle}>{normalizedQuery || category ? "검색 결과가 없습니다" : "냉장고가 비어 있어요"}</Text><Text style={s.webEmptyFridgeDescription}>{normalizedQuery || category ? "검색어 또는 분류를 바꿔보세요." : "영수증 스캔이나 직접 입력으로 재료를 추가해보세요."}</Text>{!normalizedQuery && !category ? <View style={s.webEmptyActions}><Pressable accessibilityRole="button" onPress={() => void captureReceipt()} style={s.emptySecondaryButton}><Text style={s.emptySecondaryButtonText}>영수증 스캔</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setIsAdding(true)} style={s.emptyPrimaryButton}><Text style={s.emptyPrimaryButtonText}>재료 추가</Text></Pressable></View> : null}</View>} renderSectionHeader={({ section }) => <View style={s.fridgeSectionHeader}><PackageOpen color="#2a4a3c" size={22} /><Text style={s.fridgeSectionTitle}>{section.title}</Text></View>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => { setSelectedItem(item); setEditingName(item.name); setEditingQuantity(item.quantity ?? ""); setEditingExpiresAt(item.expiresAt ?? ""); }} style={({ pressed }) => [s.webFridgeItemCard, pressed && s.cardPressed]}><View style={s.flex}><Text style={s.webFridgeItemName}>{item.name}</Text>{item.expiresAt ? <Text style={s.webFridgeItemMeta}>{item.expiresAt}까지</Text> : null}</View>{item.quantity ? <Text style={s.webFridgeItemQuantity}>{item.quantity}</Text> : <ChevronRight color={colors.tertiary} size={20} />}</Pressable>} />
    <Pressable accessibilityRole="button" accessibilityLabel="재료 추가" onPress={() => setIsAdding(true)} style={s.fridgeFloatingAdd}><Plus color={colors.onGreen} size={20} /><Text style={s.fridgeFloatingAddText}>재료 추가</Text></Pressable>
    <NativeSheet onClose={() => setIsAdding(false)} title="재료 직접 추가" visible={isAdding}><View style={s.sheetContent}><Text style={s.inputLabel}>재료 이름</Text><TextInput accessibilityLabel="재료 이름" multiline onChangeText={setName} placeholder="재료를 줄바꿈 또는 쉼표로 구분해 입력하세요" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={name} /><Text style={[s.inputLabel, s.secondaryInput]}>종류</Text><View style={s.categoryChipRow}>{sectionOrder.map((key) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: newCategory === key }} onPress={() => setNewCategory(key)} style={[s.mealTypeChip, newCategory === key && s.mealTypeChipSelected]}><Text style={[s.mealTypeChipText, newCategory === key && s.mealTypeChipTextSelected]}>{filterLabels[key]}</Text></Pressable>)}</View><TextInput accessibilityLabel="수량" onChangeText={setQuantity} placeholder="수량 (선택)" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={quantity} /><TextInput accessibilityLabel="소비기한" autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setExpiresAt} placeholder="소비기한 YYYY-MM-DD (선택)" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={expiresAt} /><Pressable disabled={isSaving || !name.trim()} onPress={() => void save()} style={[s.saveMealButton, (isSaving || !name.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "추가 중이에요" : "재료 추가"}</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => setSelectedItem(null)} title="재료 관리" visible={Boolean(selectedItem)}><View style={s.sheetContent}>{error ? <Text accessibilityRole="alert" style={s.formError}>{error}</Text> : null}<Text style={s.inputLabel}>재료 이름</Text><TextInput accessibilityLabel="재료 이름" onChangeText={setEditingName} placeholder="재료 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingName} /><Text style={[s.inputLabel, s.secondaryInput]}>수량</Text><TextInput accessibilityLabel="수량" onChangeText={setEditingQuantity} placeholder="수량 (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingQuantity} /><Text style={[s.inputLabel, s.secondaryInput]}>소비기한</Text><TextInput accessibilityLabel="소비기한" autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setEditingExpiresAt} placeholder="YYYY-MM-DD (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingExpiresAt} /><Pressable disabled={isSaving || !editingName.trim()} onPress={() => { if (selectedItem) { void updateItem(selectedItem.id, { name: editingName, quantity: editingQuantity, expiresAt: editingExpiresAt }).then(() => setSelectedItem(null)).catch(() => undefined); } }} style={[s.saveMealButton, (isSaving || !editingName.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "수정 저장"}</Text></Pressable><Pressable disabled={isSaving} onPress={() => { if (selectedItem) { void removeItem(selectedItem.id).then(() => setSelectedItem(null)).catch(() => undefined); } }} style={s.deleteButton}><Trash2 color="#b91c1c" size={18} /><Text style={s.deleteButtonText}>재료 삭제</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => { setReceiptScanId(null); setReceiptCandidates([]); }} title="영수증 재료 확인" visible={Boolean(receiptScanId)}><View style={s.sheetContent}><Text style={s.caption}>추가할 재료를 선택한 뒤 냉장고에 저장하세요.</Text>{receiptCandidates.map((candidate) => { const selected = selectedReceiptIds.has(candidate.tempId); return <Pressable key={candidate.tempId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedReceiptIds((current) => { const next = new Set(current); if (next.has(candidate.tempId)) next.delete(candidate.tempId); else next.add(candidate.tempId); return next; })} style={[s.receiptCandidate, selected && s.childRowSelected]}><View style={[s.checkmark, selected && s.checkmarkSelected]}><Text style={s.checkmarkText}>{selected ? "✓" : ""}</Text></View><View style={s.flex}><Text style={s.ingredientName}>{candidate.name}</Text><Text style={s.caption}>{categoryLabels[candidate.category]}</Text></View></Pressable>; })}<Pressable disabled={isSaving || selectedReceiptIds.size === 0} onPress={() => void saveReceiptCandidates()} style={[s.saveMealButton, (isSaving || selectedReceiptIds.size === 0) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : `${selectedReceiptIds.size}개 재료 추가`}</Text></Pressable></View></NativeSheet>
  </View>;
}

function Chip({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.chipSelected]}><Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text></Pressable>;
}

function TasteChooser({ onChange, value }: { onChange: (value: NonNullable<SavedRecipe["taste"]>) => void; value: NonNullable<SavedRecipe["taste"]> }) {
  const options: NonNullable<SavedRecipe["taste"]>[] = ["좋아해요", "보통이에요", "싫어해요"];
  return <View style={s.categoryChipRow}>{options.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: option === value }} onPress={() => onChange(option)} style={[s.mealTypeChip, option === value && s.mealTypeChipSelected]}><Text style={[s.mealTypeChipText, option === value && s.mealTypeChipTextSelected]}>{option}</Text></Pressable>)}</View>;
}

function RecipeScreen() {
  const { createRecipe, error, isLoading, isRecommending, loadFridgeIngredients, recommend, recommendationCanRetry, recommendationError, recommendationNotice, recommendationRetryAfterSeconds, recommendations, refresh, removeRecipe, retryRecommendation, saveRecommendation, savedRecipes, updateRecipe } = useRecipes();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  const [draftLink, setDraftLink] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftTaste, setDraftTaste] = useState<NonNullable<SavedRecipe["taste"]>>("보통이에요");
  const [recipeActionError, setRecipeActionError] = useState<string | null>(null);
  const [isIngredientPickerOpen, setIsIngredientPickerOpen] = useState(false);
  const [ingredientPickerError, setIngredientPickerError] = useState<string | null>(null);
  const [ingredientSelectionError, setIngredientSelectionError] = useState<string | null>(null);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const save = async (id: string) => {
    const recipe = recommendations.find((item) => item.id === id);
    if (!recipe) return;
    try {
      setSavingId(id);
      await saveRecommendation(recipe);
    } catch {
      // The hook exposes a recovery message in the screen.
    } finally {
      setSavingId(null);
    }
  };
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSavedRecipes = savedRecipes.filter((recipe) => !normalizedQuery || recipe.title.toLowerCase().includes(normalizedQuery) || recipe.subtitle?.toLowerCase().includes(normalizedQuery) || recipe.memo?.toLowerCase().includes(normalizedQuery));
  const filteredRecommendations = recommendations.filter((recipe) => !normalizedQuery || recipe.title.toLowerCase().includes(normalizedQuery) || recipe.subtitle.toLowerCase().includes(normalizedQuery) || recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(normalizedQuery)));
  const recommendationCards = filteredRecommendations.map((recipe) => ({ id: recipe.id, title: recipe.title, subtitle: `${recipe.subtitle} · ${recipe.ingredients.join(" · ")}`, isRecommendation: true }));
  const savedRecipeCards = filteredSavedRecipes.map((recipe) => ({ id: recipe.id, title: recipe.title, subtitle: recipe.subtitle ?? recipe.memo ?? "저장한 레시피", isRecommendation: false }));
  const cards = [...recommendationCards, ...savedRecipeCards];
  const openRecipe = (id: string) => {
    const recipe = savedRecipes.find((item) => item.id === id);
    if (!recipe) return;
    setSelectedRecipe(recipe);
    setDraftTitle(recipe.title);
    setDraftSubtitle(recipe.subtitle ?? "");
    setDraftLink(recipe.link ?? "");
    setDraftMemo(recipe.memo ?? "");
    setDraftTaste(recipe.taste ?? "보통이에요");
  };
  const saveManualRecipe = async () => {
    try {
      await createRecipe({ title: draftTitle, subtitle: draftSubtitle, link: draftLink, memo: draftMemo, taste: draftTaste });
      setDraftTitle("");
      setDraftSubtitle("");
      setDraftLink("");
      setDraftMemo("");
      setDraftTaste("보통이에요");
      setIsAdding(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const updateSelectedRecipe = async () => {
    if (!selectedRecipe) return;
    try {
      await updateRecipe(selectedRecipe.id, { title: draftTitle, subtitle: draftSubtitle, link: draftLink, memo: draftMemo, taste: draftTaste });
      setSelectedRecipe(null);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const openRecipeLink = async (link?: string) => {
    if (!link?.trim()) return;
    try {
      const url = link.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) throw new Error("http 또는 https 링크만 열 수 있어요.");
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error("이 기기에서 링크를 열 수 없어요.");
      await Linking.openURL(url);
    } catch (caught) {
      setRecipeActionError(caught instanceof Error ? caught.message : "레시피 링크를 열지 못했습니다.");
    }
  };
  const openIngredientPicker = async () => {
    try {
      setIsIngredientPickerOpen(true);
      setIsLoadingIngredients(true);
      setRecipeActionError(null);
      setIngredientPickerError(null);
      setIngredientSelectionError(null);
      const items = await loadFridgeIngredients();
      const selectableItems = items.filter((item) => !isRecommendationIngredientNameTooLong(item.name));
      setFridgeIngredients(items);
      setSelectedIngredientIds((current) => {
        const retainedIds = [...current]
          .filter((id) => selectableItems.some((item) => item.id === id))
          .slice(0, MAX_RECIPE_RECOMMENDATION_INGREDIENTS);
        return retainedIds.length
          ? new Set(retainedIds)
          : new Set(selectableItems.slice(0, MAX_RECIPE_RECOMMENDATION_INGREDIENTS).map((item) => item.id));
      });
    } catch (caught) {
      setIngredientPickerError(caught instanceof Error ? caught.message : "냉장고 재료를 불러오지 못했습니다.");
    } finally {
      setIsLoadingIngredients(false);
    }
  };
  const toggleIngredientSelection = (ingredientId: string) => {
    const ingredient = fridgeIngredients.find((item) => item.id === ingredientId);
    if (ingredient && isRecommendationIngredientNameTooLong(ingredient.name)) {
      setIngredientSelectionError(getRecommendationIngredientLengthMessage());
      return;
    }
    if (!selectedIngredientIds.has(ingredientId) && selectedIngredientIds.size >= MAX_RECIPE_RECOMMENDATION_INGREDIENTS) {
      setIngredientSelectionError(`추천 재료는 최대 ${MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있어요.`);
      return;
    }
    setIngredientSelectionError(null);
    setSelectedIngredientIds((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  };
  const requestRecommendation = async () => {
    try {
      const ingredients = fridgeIngredients.filter((item) => selectedIngredientIds.has(item.id)).map((item) => item.name);
      await recommend(ingredients);
      setIsIngredientPickerOpen(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const retryCurrentRecommendation = async () => {
    try {
      await retryRecommendation();
      setIsIngredientPickerOpen(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const outsideError = recipeActionError ?? recommendationError ?? ingredientPickerError ?? error;
  const outsideRetry = recipeActionError ? undefined : recommendationError ? recommendationCanRetry ? () => void retryCurrentRecommendation() : undefined : ingredientPickerError ? () => void openIngredientPicker() : error ? () => void refresh() : undefined;
  const outsideRetryLabel = recommendationError ? recommendationCanRetry ? "AI 추천 다시 시도" : undefined : ingredientPickerError ? "재료 다시 불러오기" : error ? "저장 목록 다시 불러오기" : undefined;
  const recommendationActionDisabled = isRecommending || recommendationRetryAfterSeconds !== null;
  const pickerError = recommendationError ?? ingredientPickerError ?? ingredientSelectionError;
  return <>
    <FlatList
      contentContainerStyle={s.listContent}
      data={isLoading ? [] : cards}
      initialNumToRender={8}
      keyExtractor={(item) => `${item.isRecommendation ? "ai" : "saved"}:${item.id}`}
      ListHeaderComponent={<>
        <Header title="레시피"><IconButton label="새 레시피" onPress={() => { setDraftTitle(""); setDraftSubtitle(""); setDraftLink(""); setDraftMemo(""); setDraftTaste("보통이에요"); setRecipeActionError(null); setIsAdding(true); }}><Plus color={colors.foreground} size={22} /></IconButton></Header>
        <View style={s.recipeHero}>
          <View style={s.recipeAiIcon}><Sparkles color={colors.aiIcon} size={24} /></View>
          <Text style={s.recipeHeroTitle}>{recommendations.length ? "오늘의 레시피가 준비됐어요." : "냉장고 재료로 추천받아 보세요."}</Text>
          <Text style={s.recipeHeroDescription}>{recommendations.length ? "보관 중인 재료를 우선 활용한 메뉴예요." : "아이 개월 수와 보관 중인 재료를 반영해요."}</Text>
          <Pressable accessibilityRole="button" disabled={recommendationActionDisabled} onPress={() => void openIngredientPicker()} style={[s.button, recommendationActionDisabled && s.disabled]}>{isRecommending ? <ActivityIndicator color={colors.onGreen} size="small" /> : <Sparkles color={colors.onGreen} size={18} />}<Text style={s.buttonText}>{isRecommending ? "추천을 만들고 있어요" : recommendationRetryAfterSeconds ? "잠시 후 다시 시도" : "AI 레시피 추천받기"}</Text></Pressable>
        </View>
        {recommendationNotice ? <RecipeSuccessNotice message={recommendationNotice} /> : null}
        {outsideError ? <RecipeIssueNotice message={outsideError} onRetry={outsideRetry} retryLabel={outsideRetryLabel} title={recommendationError ? "AI 추천을 준비하지 못했어요." : ingredientPickerError ? "냉장고 재료를 불러오지 못했어요." : undefined} /> : null}
        <TextInput accessibilityLabel="레시피 검색" onChangeText={setQuery} placeholder="레시피 검색" placeholderTextColor={colors.tertiary} style={s.recipeSearchInput} value={query} />
        {isLoading ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>저장한 레시피를 불러오고 있어요.</Text></View> : null}
        {!isLoading && cards.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyTitle}>{query ? "찾는 레시피가 없어요." : "저장한 레시피가 없어요."}</Text><Text style={s.caption}>{query ? "검색어를 바꾸거나 새 레시피를 추가해 보세요." : "냉장고 재료를 추가하고 AI 추천을 받아보세요."}</Text></View> : null}
      </>}
      renderItem={({ item: recipe, index }) => <>
        {index === 0 || cards[index - 1]?.isRecommendation !== recipe.isRecommendation ? <Section title={recipe.isRecommendation ? "오늘의 추천" : "저장한 레시피"} /> : null}
        <Pressable accessibilityRole="button" disabled={recipe.isRecommendation && savingId === recipe.id} onPress={recipe.isRecommendation ? () => void save(recipe.id) : () => openRecipe(recipe.id)} style={[s.recipeCard, s.recipeListItem, recipe.isRecommendation && savingId === recipe.id && s.disabled]}><View style={s.recipeThumb}><ChefHat color={colors.greenDeep} size={30} /></View><View style={s.flex}><Text style={s.recipeName}>{recipe.title}</Text><Text style={s.caption}>{recipe.subtitle}</Text></View><Text style={s.recipeAction}>{recipe.isRecommendation ? (savingId === recipe.id ? "저장 중" : "저장") : "보기"}</Text></Pressable>
      </>}
    />
    <NativeSheet onClose={() => setIsIngredientPickerOpen(false)} title="추천 재료 선택" visible={isIngredientPickerOpen}>
      <View style={s.sheetContent}>
        <Text style={s.caption}>추천에 사용할 냉장고 재료를 선택해주세요. 최대 {MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있고, 이름이 {MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH}자를 넘는 재료는 사용할 수 없어요.</Text>
        {pickerError ? <RecipeIssueNotice message={pickerError} onRetry={recommendationError ? recommendationCanRetry ? () => void requestRecommendation() : undefined : ingredientPickerError ? () => void openIngredientPicker() : undefined} retryLabel={recommendationError ? recommendationCanRetry ? "AI 추천 다시 시도" : undefined : ingredientPickerError ? "재료 다시 불러오기" : undefined} title={recommendationError ? "AI 추천을 준비하지 못했어요." : ingredientPickerError ? "냉장고 재료를 불러오지 못했어요." : "추천 재료를 확인해주세요."} /> : null}
        {isRecommending ? <View style={s.recipeRecommendationProgress}><ActivityIndicator color={colors.green} /><Text style={s.recipeRecommendationProgressText}>AI가 재료를 살펴보고 있어요. 잠시만 기다려주세요.</Text></View> : null}
        {isLoadingIngredients ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>냉장고 재료를 불러오고 있어요.</Text></View> : null}
        {!isLoadingIngredients && fridgeIngredients.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyTitle}>선택할 재료가 없어요.</Text><Text style={s.caption}>냉장고에 재료를 추가한 뒤 다시 시도해주세요.</Text></View> : null}
        {fridgeIngredients.map((ingredient) => { const selected = selectedIngredientIds.has(ingredient.id); const nameTooLong = isRecommendationIngredientNameTooLong(ingredient.name); return <Pressable key={ingredient.id} accessibilityRole="checkbox" accessibilityLabel={nameTooLong ? `${ingredient.name}, 이름이 너무 길어 AI 추천 재료로 선택할 수 없음` : ingredient.name} accessibilityState={{ checked: selected, disabled: nameTooLong }} disabled={nameTooLong} onPress={() => toggleIngredientSelection(ingredient.id)} style={[s.receiptCandidate, selected && s.childRowSelected, nameTooLong && s.disabled]}><View style={[s.checkmark, selected && s.checkmarkSelected]}><Text style={s.checkmarkText}>{selected ? "✓" : ""}</Text></View><View style={s.flex}><Text style={s.ingredientName}>{ingredient.name}</Text>{nameTooLong ? <Text style={s.caption}>이름이 너무 길어 선택할 수 없어요.</Text> : null}</View></Pressable>; })}
        <Pressable accessibilityRole="button" disabled={isLoadingIngredients || recommendationActionDisabled || selectedIngredientIds.size === 0} onPress={() => void requestRecommendation()} style={[s.saveMealButton, (isLoadingIngredients || recommendationActionDisabled || selectedIngredientIds.size === 0) && s.disabled]}><Text style={s.saveMealButtonText}>{isRecommending ? "추천을 만들고 있어요" : recommendationRetryAfterSeconds ? "잠시 후 다시 시도" : `${selectedIngredientIds.size}개 재료로 추천받기`}</Text></Pressable>
      </View>
    </NativeSheet>
    <NativeSheet onClose={() => setIsAdding(false)} title="새 레시피" visible={isAdding}><View style={s.sheetContent}><Text style={s.inputLabel}>레시피 이름</Text><TextInput accessibilityLabel="레시피 이름" onChangeText={setDraftTitle} placeholder="예: 소고기 애호박 진밥" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftTitle} /><Text style={[s.inputLabel, s.secondaryInput]}>한 줄 설명</Text><TextInput accessibilityLabel="레시피 한 줄 설명" onChangeText={setDraftSubtitle} placeholder="선택 입력" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftSubtitle} /><Text style={[s.inputLabel, s.secondaryInput]}>레시피 링크</Text><TextInput accessibilityLabel="레시피 링크" autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={setDraftLink} placeholder="유튜브, 블로그 URL (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftLink} /><Text style={[s.inputLabel, s.secondaryInput]}>메모</Text><TextInput accessibilityLabel="레시피 메모" multiline onChangeText={setDraftMemo} placeholder="재료나 조리법을 적어주세요." placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={draftMemo} /><Text style={[s.inputLabel, s.secondaryInput]}>아이 반응</Text><TasteChooser onChange={setDraftTaste} value={draftTaste} /><Pressable disabled={!draftTitle.trim()} onPress={() => void saveManualRecipe()} style={[s.saveMealButton, !draftTitle.trim() && s.disabled]}><Text style={s.saveMealButtonText}>레시피 저장</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => setSelectedRecipe(null)} title="레시피 관리" visible={Boolean(selectedRecipe)}><View style={s.sheetContent}><Text style={s.inputLabel}>레시피 이름</Text><TextInput accessibilityLabel="레시피 이름" onChangeText={setDraftTitle} placeholder="레시피 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftTitle} /><Text style={[s.inputLabel, s.secondaryInput]}>한 줄 설명</Text><TextInput accessibilityLabel="레시피 한 줄 설명" onChangeText={setDraftSubtitle} placeholder="선택 입력" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftSubtitle} /><Text style={[s.inputLabel, s.secondaryInput]}>레시피 링크</Text><TextInput accessibilityLabel="레시피 링크" autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={setDraftLink} placeholder="유튜브, 블로그 URL (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftLink} /><Text style={[s.inputLabel, s.secondaryInput]}>메모</Text><TextInput accessibilityLabel="레시피 메모" multiline onChangeText={setDraftMemo} placeholder="재료나 조리법" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={draftMemo} /><Text style={[s.inputLabel, s.secondaryInput]}>아이 반응</Text><TasteChooser onChange={setDraftTaste} value={draftTaste} /><Pressable disabled={!draftTitle.trim()} onPress={() => void updateSelectedRecipe()} style={[s.saveMealButton, !draftTitle.trim() && s.disabled]}><Pencil color={colors.onGreen} size={18} /><Text style={s.saveMealButtonText}>수정 저장</Text></Pressable>{selectedRecipe ? <View style={s.sheetSplitActions}>{selectedRecipe.link?.trim() ? <Pressable onPress={() => void openRecipeLink(selectedRecipe.link)} style={s.secondaryActionButton}><Text style={s.secondaryActionText}>링크 열기</Text></Pressable> : null}<Pressable onPress={() => void updateRecipe(selectedRecipe.id, { favorite: !selectedRecipe.favorite })} style={s.secondaryActionButton}><Heart color={colors.greenDeep} fill={selectedRecipe.favorite ? colors.greenDeep : "transparent"} size={18} /><Text style={s.secondaryActionText}>{selectedRecipe.favorite ? "즐겨찾기 해제" : "즐겨찾기"}</Text></Pressable><Pressable onPress={() => { void removeRecipe(selectedRecipe.id); setSelectedRecipe(null); }} style={s.secondaryActionButton}><Trash2 color="#b91c1c" size={18} /><Text style={s.deleteButtonText}>삭제</Text></Pressable></View> : null}</View></NativeSheet>
  </>;
}

function RecipeWebScreen() {
  const { createRecipe, error, isLoading, isRecommending, loadFridgeIngredients, recommend, recommendationCanRetry, recommendationError, recommendationNotice, recommendationRetryAfterSeconds, recommendations, refresh, removeRecipe, retryRecommendation, saveRecommendation, savedRecipes, updateRecipe } = useRecipes();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [recipeTab, setRecipeTab] = useState<"all" | "ai" | "favorite">("all");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  const [draftLink, setDraftLink] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftTaste, setDraftTaste] = useState<NonNullable<SavedRecipe["taste"]>>("보통이에요");
  const [recipeActionError, setRecipeActionError] = useState<string | null>(null);
  const [isIngredientPickerOpen, setIsIngredientPickerOpen] = useState(false);
  const [ingredientPickerError, setIngredientPickerError] = useState<string | null>(null);
  const [ingredientSelectionError, setIngredientSelectionError] = useState<string | null>(null);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSavedRecipes = savedRecipes.filter((recipe) => !normalizedQuery || recipe.title.toLowerCase().includes(normalizedQuery) || recipe.subtitle?.toLowerCase().includes(normalizedQuery) || recipe.memo?.toLowerCase().includes(normalizedQuery));
  const filteredRecommendations = recommendations.filter((recipe) => !normalizedQuery || recipe.title.toLowerCase().includes(normalizedQuery) || recipe.subtitle.toLowerCase().includes(normalizedQuery) || recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(normalizedQuery)));
  const savedRecipeCards = filteredSavedRecipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    subtitle: recipe.subtitle ?? recipe.memo ?? "저장한 레시피",
    isRecommendation: false,
    favorite: recipe.favorite,
    source: recipe.source,
    taste: recipe.taste,
  }));
  const recommendationCards = filteredRecommendations.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    subtitle: `${recipe.subtitle} · ${recipe.ingredients.join(" · ")}`,
    isRecommendation: true,
    favorite: false,
    source: "ai" as const,
    taste: undefined,
  }));
  const cards = recipeTab === "ai" ? recommendationCards : recipeTab === "favorite" ? savedRecipeCards.filter((recipe) => recipe.favorite) : [...recommendationCards, ...savedRecipeCards];

  const resetDraft = () => {
    setDraftTitle("");
    setDraftSubtitle("");
    setDraftLink("");
    setDraftMemo("");
    setDraftTaste("보통이에요");
    setRecipeActionError(null);
  };
  const openRecipe = (id: string) => {
    const recipe = savedRecipes.find((item) => item.id === id);
    if (!recipe) return;
    setSelectedRecipe(recipe);
    setDraftTitle(recipe.title);
    setDraftSubtitle(recipe.subtitle ?? "");
    setDraftLink(recipe.link ?? "");
    setDraftMemo(recipe.memo ?? "");
    setDraftTaste(recipe.taste ?? "보통이에요");
  };
  const saveRecommendationItem = async (id: string) => {
    const recipe = recommendations.find((item) => item.id === id);
    if (!recipe) return;
    try {
      setSavingId(id);
      await saveRecommendation(recipe);
    } catch {
      // The hook exposes a recovery message in the screen.
    } finally {
      setSavingId(null);
    }
  };
  const saveManualRecipe = async () => {
    try {
      await createRecipe({ title: draftTitle, subtitle: draftSubtitle, link: draftLink, memo: draftMemo, taste: draftTaste });
      resetDraft();
      setIsAdding(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const updateSelectedRecipe = async () => {
    if (!selectedRecipe) return;
    try {
      await updateRecipe(selectedRecipe.id, { title: draftTitle, subtitle: draftSubtitle, link: draftLink, memo: draftMemo, taste: draftTaste });
      setSelectedRecipe(null);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const toggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await updateRecipe(id, { favorite: !favorite });
      setSelectedRecipe((current) => current?.id === id ? { ...current, favorite: !favorite } : current);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const openRecipeLink = async (link?: string) => {
    if (!link?.trim()) return;
    try {
      const url = link.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) throw new Error("http 또는 https 링크만 열 수 있어요.");
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error("이 기기에서 링크를 열 수 없어요.");
      await Linking.openURL(url);
    } catch (caught) {
      setRecipeActionError(caught instanceof Error ? caught.message : "레시피 링크를 열지 못했습니다.");
    }
  };
  const openIngredientPicker = async () => {
    try {
      setIsIngredientPickerOpen(true);
      setIsLoadingIngredients(true);
      setRecipeActionError(null);
      setIngredientPickerError(null);
      setIngredientSelectionError(null);
      const items = await loadFridgeIngredients();
      const selectableItems = items.filter((item) => !isRecommendationIngredientNameTooLong(item.name));
      setFridgeIngredients(items);
      setSelectedIngredientIds((current) => {
        const retainedIds = [...current]
          .filter((id) => selectableItems.some((item) => item.id === id))
          .slice(0, MAX_RECIPE_RECOMMENDATION_INGREDIENTS);
        return retainedIds.length
          ? new Set(retainedIds)
          : new Set(selectableItems.slice(0, MAX_RECIPE_RECOMMENDATION_INGREDIENTS).map((item) => item.id));
      });
    } catch (caught) {
      setIngredientPickerError(caught instanceof Error ? caught.message : "냉장고 재료를 불러오지 못했습니다.");
    } finally {
      setIsLoadingIngredients(false);
    }
  };
  const toggleIngredientSelection = (ingredientId: string) => {
    const ingredient = fridgeIngredients.find((item) => item.id === ingredientId);
    if (ingredient && isRecommendationIngredientNameTooLong(ingredient.name)) {
      setIngredientSelectionError(getRecommendationIngredientLengthMessage());
      return;
    }
    if (!selectedIngredientIds.has(ingredientId) && selectedIngredientIds.size >= MAX_RECIPE_RECOMMENDATION_INGREDIENTS) {
      setIngredientSelectionError(`추천 재료는 최대 ${MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있어요.`);
      return;
    }
    setIngredientSelectionError(null);
    setSelectedIngredientIds((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  };
  const requestRecommendation = async () => {
    try {
      const ingredients = fridgeIngredients.filter((item) => selectedIngredientIds.has(item.id)).map((item) => item.name);
      await recommend(ingredients);
      setRecipeTab("ai");
      setIsIngredientPickerOpen(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const retryCurrentRecommendation = async () => {
    try {
      await retryRecommendation();
      setRecipeTab("ai");
      setIsIngredientPickerOpen(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const outsideError = recipeActionError ?? recommendationError ?? ingredientPickerError ?? error;
  const outsideRetry = recipeActionError ? undefined : recommendationError ? recommendationCanRetry ? () => void retryCurrentRecommendation() : undefined : ingredientPickerError ? () => void openIngredientPicker() : error ? () => void refresh() : undefined;
  const outsideRetryLabel = recommendationError ? recommendationCanRetry ? "AI 추천 다시 시도" : undefined : ingredientPickerError ? "재료 다시 불러오기" : error ? "저장 목록 다시 불러오기" : undefined;
  const recommendationActionDisabled = isRecommending || recommendationRetryAfterSeconds !== null;
  const pickerError = recommendationError ?? ingredientPickerError ?? ingredientSelectionError;

  return <View style={s.recipeScreen}>
    <FlatList
      contentContainerStyle={s.recipeListContent}
      data={isLoading ? [] : cards}
      initialNumToRender={8}
      keyExtractor={(item) => `${item.isRecommendation ? "ai" : "saved"}:${item.id}`}
      ListEmptyComponent={isLoading ? null : <View style={s.webRecipeEmpty}>
        <ChefHat color={colors.greenDeep} size={30} />
        <Text style={s.webRecipeEmptyTitle}>{recipeTab === "ai" ? "AI 추천을 받아보세요" : recipeTab === "favorite" ? "즐겨찾기한 레시피가 없어요" : query ? "찾는 레시피가 없어요" : "아직 저장한 레시피가 없어요"}</Text>
        <Text style={s.webRecipeEmptyDescription}>{recipeTab === "ai" ? "냉장고 재료를 고르면 아이에게 맞는 메뉴를 추천해드려요." : "새 레시피를 추가하거나 냉장고 재료로 추천받아 보세요."}</Text>
      </View>}
      ListHeaderComponent={<View style={s.recipePageHeader}>
        <View style={s.recipePageTitleRow}>
          <Text style={s.recipePageTitle}>레시피</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="새 레시피" onPress={() => { resetDraft(); setIsAdding(true); }} style={s.recipeNewHeaderAction}><Plus color={colors.green} size={22} /><Text style={s.recipeNewHeaderActionText}>직접 추가</Text></Pressable>
        </View>
        <View style={s.webSearchField}>
          <Search color="#9aa39f" size={22} />
          <TextInput accessibilityLabel="레시피 검색" onChangeText={setQuery} placeholder="레시피 검색" placeholderTextColor="#9aa39f" style={s.webSearchInput} value={query} />
        </View>
        <View style={s.recipeWebTabs}>
          {([ ["all", "전체 레시피"], ["ai", "AI 추천"], ["favorite", "즐겨찾기"] ] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: recipeTab === id }} onPress={() => setRecipeTab(id)} style={[s.recipeWebTab, recipeTab === id && s.recipeWebTabActive]}><Text style={[s.recipeWebTabText, recipeTab === id && s.recipeWebTabTextActive]}>{label}</Text></Pressable>)}
        </View>
        {recommendationNotice ? <RecipeSuccessNotice message={recommendationNotice} /> : null}
        {outsideError ? <RecipeIssueNotice message={outsideError} onRetry={outsideRetry} retryLabel={outsideRetryLabel} title={recommendationError ? "AI 추천을 준비하지 못했어요." : ingredientPickerError ? "냉장고 재료를 불러오지 못했어요." : undefined} /> : null}
        {isLoading ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>저장한 레시피를 불러오고 있어요.</Text></View> : null}
      </View>}
      renderItem={({ item: recipe }) => <View style={[s.webRecipeCard, recipe.isRecommendation && s.webRecipeCardAi]}>
        <Pressable accessibilityRole="button" disabled={recipe.isRecommendation && savingId === recipe.id} onPress={recipe.isRecommendation ? () => void saveRecommendationItem(recipe.id) : () => openRecipe(recipe.id)} style={[s.webRecipeCardPressable, recipe.isRecommendation && savingId === recipe.id && s.disabled]}>
          <View style={s.webRecipeCardTitleRow}>
            <Text numberOfLines={1} style={s.webRecipeCardTitle}>{recipe.title}</Text>
            {recipe.isRecommendation ? <View style={s.webRecipeAiBadge}><Sparkles color={colors.greenDeep} size={13} /><Text style={s.webRecipeAiBadgeText}>AI 추천</Text></View> : null}
          </View>
          <Text numberOfLines={2} style={s.webRecipeCardDescription}>{recipe.subtitle}</Text>
          <View style={s.webRecipeTags}>
            {!recipe.isRecommendation && recipe.taste ? <View style={s.webRecipeTag}><Text style={s.webRecipeTagText}>{recipe.taste}</Text></View> : null}
            <Text style={s.webRecipeSource}>{recipe.isRecommendation ? "눌러서 저장" : recipe.source === "ai" ? "AI 레시피" : "직접 저장"}</Text>
          </View>
        </Pressable>
        {recipe.isRecommendation ? <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.title} 저장`} disabled={savingId === recipe.id} onPress={() => void saveRecommendationItem(recipe.id)} style={[s.webRecipeSideAction, savingId === recipe.id && s.disabled]}><Text style={s.webRecipeSaveText}>{savingId === recipe.id ? "저장 중" : "저장"}</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.title} 즐겨찾기`} onPress={() => void toggleFavorite(recipe.id, recipe.favorite)} style={s.webRecipeSideAction}><Heart color={recipe.favorite ? colors.green : colors.secondary} fill={recipe.favorite ? colors.green : "transparent"} size={21} /></Pressable>}
      </View>}
    />
    <View style={s.recipeBottomActions}>
      <Pressable accessibilityRole="button" disabled={recommendationActionDisabled} onPress={() => void openIngredientPicker()} style={[s.recipeAiCta, recommendationActionDisabled && s.disabled]}>{isRecommending ? <ActivityIndicator color={colors.onGreen} size="small" /> : <Sparkles color={colors.onGreen} size={18} />}<Text style={s.recipeAiCtaText}>{isRecommending ? "추천 중" : recommendationRetryAfterSeconds ? "잠시 후 다시 시도" : "AI 추천"}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { resetDraft(); setIsAdding(true); }} style={s.recipeAddCta}><Plus color={colors.greenDeep} size={19} /><Text style={s.recipeAddCtaText}>레시피 추가</Text></Pressable>
    </View>
    <NativeSheet onClose={() => setIsIngredientPickerOpen(false)} title="추천 재료 선택" visible={isIngredientPickerOpen}>
      <View style={s.sheetContent}>
        <Text style={s.caption}>추천에 사용할 냉장고 재료를 선택해주세요. 최대 {MAX_RECIPE_RECOMMENDATION_INGREDIENTS}개까지 선택할 수 있고, 이름이 {MAX_RECIPE_RECOMMENDATION_INGREDIENT_LENGTH}자를 넘는 재료는 사용할 수 없어요.</Text>
        {pickerError ? <RecipeIssueNotice message={pickerError} onRetry={recommendationError ? recommendationCanRetry ? () => void requestRecommendation() : undefined : ingredientPickerError ? () => void openIngredientPicker() : undefined} retryLabel={recommendationError ? recommendationCanRetry ? "AI 추천 다시 시도" : undefined : ingredientPickerError ? "재료 다시 불러오기" : undefined} title={recommendationError ? "AI 추천을 준비하지 못했어요." : ingredientPickerError ? "냉장고 재료를 불러오지 못했어요." : "추천 재료를 확인해주세요."} /> : null}
        {isRecommending ? <View style={s.recipeRecommendationProgress}><ActivityIndicator color={colors.green} /><Text style={s.recipeRecommendationProgressText}>AI가 재료를 살펴보고 있어요. 잠시만 기다려주세요.</Text></View> : null}
        {isLoadingIngredients ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>냉장고 재료를 불러오고 있어요.</Text></View> : null}
        {!isLoadingIngredients && fridgeIngredients.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyTitle}>선택할 재료가 없어요.</Text><Text style={s.caption}>냉장고에 재료를 추가한 뒤 다시 시도해주세요.</Text></View> : null}
        {fridgeIngredients.map((ingredient) => {
          const selected = selectedIngredientIds.has(ingredient.id);
          const nameTooLong = isRecommendationIngredientNameTooLong(ingredient.name);
          return <Pressable key={ingredient.id} accessibilityRole="checkbox" accessibilityLabel={nameTooLong ? `${ingredient.name}, 이름이 너무 길어 AI 추천 재료로 선택할 수 없음` : ingredient.name} accessibilityState={{ checked: selected, disabled: nameTooLong }} disabled={nameTooLong} onPress={() => toggleIngredientSelection(ingredient.id)} style={[s.receiptCandidate, selected && s.childRowSelected, nameTooLong && s.disabled]}><View style={[s.checkmark, selected && s.checkmarkSelected]}><Text style={s.checkmarkText}>{selected ? "✓" : ""}</Text></View><View style={s.flex}><Text style={s.ingredientName}>{ingredient.name}</Text>{nameTooLong ? <Text style={s.caption}>이름이 너무 길어 선택할 수 없어요.</Text> : null}</View></Pressable>;
        })}
        <Pressable accessibilityRole="button" disabled={isLoadingIngredients || recommendationActionDisabled || selectedIngredientIds.size === 0} onPress={() => void requestRecommendation()} style={[s.saveMealButton, s.recommendationSubmitButton, (isLoadingIngredients || recommendationActionDisabled || selectedIngredientIds.size === 0) && s.disabled]}>{isRecommending ? <ActivityIndicator color={colors.onGreen} size="small" /> : null}<Text style={s.saveMealButtonText}>{isRecommending ? "추천을 만들고 있어요" : recommendationRetryAfterSeconds ? "잠시 후 다시 시도" : `${selectedIngredientIds.size}개 재료로 추천받기`}</Text></Pressable>
      </View>
    </NativeSheet>
    <NativeSheet onClose={() => setIsAdding(false)} title="새 레시피" visible={isAdding}>
      <View style={s.sheetContent}>
        <Text style={s.inputLabel}>레시피 이름</Text><TextInput accessibilityLabel="레시피 이름" onChangeText={setDraftTitle} placeholder="예: 소고기 애호박 진밥" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftTitle} />
        <Text style={[s.inputLabel, s.secondaryInput]}>한 줄 설명</Text><TextInput accessibilityLabel="레시피 한 줄 설명" onChangeText={setDraftSubtitle} placeholder="선택 입력" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftSubtitle} />
        <Text style={[s.inputLabel, s.secondaryInput]}>레시피 링크</Text><TextInput accessibilityLabel="레시피 링크" autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={setDraftLink} placeholder="유튜브, 블로그 URL (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftLink} />
        <Text style={[s.inputLabel, s.secondaryInput]}>메모</Text><TextInput accessibilityLabel="레시피 메모" multiline onChangeText={setDraftMemo} placeholder="재료나 조리법을 적어주세요." placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={draftMemo} />
        <Text style={[s.inputLabel, s.secondaryInput]}>아이 반응</Text><TasteChooser onChange={setDraftTaste} value={draftTaste} />
        <Pressable disabled={!draftTitle.trim()} onPress={() => void saveManualRecipe()} style={[s.saveMealButton, !draftTitle.trim() && s.disabled]}><Text style={s.saveMealButtonText}>레시피 저장</Text></Pressable>
      </View>
    </NativeSheet>
    <NativeSheet onClose={() => setSelectedRecipe(null)} title="레시피 관리" visible={Boolean(selectedRecipe)}>
      <View style={s.sheetContent}>
        <Text style={s.inputLabel}>레시피 이름</Text><TextInput accessibilityLabel="레시피 이름" onChangeText={setDraftTitle} placeholder="레시피 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftTitle} />
        <Text style={[s.inputLabel, s.secondaryInput]}>한 줄 설명</Text><TextInput accessibilityLabel="레시피 한 줄 설명" onChangeText={setDraftSubtitle} placeholder="선택 입력" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftSubtitle} />
        <Text style={[s.inputLabel, s.secondaryInput]}>레시피 링크</Text><TextInput accessibilityLabel="레시피 링크" autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={setDraftLink} placeholder="유튜브, 블로그 URL (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={draftLink} />
        <Text style={[s.inputLabel, s.secondaryInput]}>메모</Text><TextInput accessibilityLabel="레시피 메모" multiline onChangeText={setDraftMemo} placeholder="재료나 조리법" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.multilineInput]} textAlignVertical="top" value={draftMemo} />
        <Text style={[s.inputLabel, s.secondaryInput]}>아이 반응</Text><TasteChooser onChange={setDraftTaste} value={draftTaste} />
        <Pressable disabled={!draftTitle.trim()} onPress={() => void updateSelectedRecipe()} style={[s.saveMealButton, !draftTitle.trim() && s.disabled]}><Pencil color={colors.onGreen} size={18} /><Text style={s.saveMealButtonText}>수정 저장</Text></Pressable>
        {selectedRecipe ? <View style={s.sheetSplitActions}>{selectedRecipe.link?.trim() ? <Pressable onPress={() => void openRecipeLink(selectedRecipe.link)} style={s.secondaryActionButton}><Text style={s.secondaryActionText}>링크 열기</Text></Pressable> : null}<Pressable onPress={() => void toggleFavorite(selectedRecipe.id, selectedRecipe.favorite)} style={s.secondaryActionButton}><Heart color={colors.greenDeep} fill={selectedRecipe.favorite ? colors.greenDeep : "transparent"} size={18} /><Text style={s.secondaryActionText}>{selectedRecipe.favorite ? "즐겨찾기 해제" : "즐겨찾기"}</Text></Pressable><Pressable onPress={() => { void removeRecipe(selectedRecipe.id); setSelectedRecipe(null); }} style={s.secondaryActionButton}><Trash2 color="#b91c1c" size={18} /><Text style={s.deleteButtonText}>삭제</Text></Pressable></View> : null}
      </View>
    </NativeSheet>
  </View>;
}

function MyScreen() {
  const { deleteAccount, requestPasswordReset, signOut } = useAuth();
  const { error, isLoading, isSaving, profile, refresh, update } = useProfile();
  const childrenState = useChildren();
  const familyState = useFamily();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [babyName, setBabyName] = useState("");
  const [monthsOld, setMonthsOld] = useState("");
  const [isChildrenOpen, setIsChildrenOpen] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildMonthsOld, setNewChildMonthsOld] = useState("");
  const [isFamilyOpen, setIsFamilyOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("배우자");
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [editingChildName, setEditingChildName] = useState("");
  const [editingChildMonthsOld, setEditingChildMonthsOld] = useState("");
  const [editingAllergies, setEditingAllergies] = useState("");
  const [editingBabyFoodStartedOn, setEditingBabyFoodStartedOn] = useState("");
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null);
  const [childActionError, setChildActionError] = useState<string | null>(null);
  const [isPickingProfilePhoto, setIsPickingProfilePhoto] = useState(false);
  const [isPickingChildPhoto, setIsPickingChildPhoto] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountNoticeTone, setAccountNoticeTone] = useState<"success" | "error">("success");
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const primaryChild = childrenState.children.find((child) => child.isPrimary) ?? childrenState.children[0];
  const guardianName = profile?.name ?? "사용자";
  const additionalChildCount = Math.max(childrenState.children.length - (primaryChild ? 1 : 0), 0);
  const allergies = primaryChild?.allergies ?? [];
  const familyPreview = familyState.members.slice(0, 3);
  const startEditing = () => {
    setName(profile?.name ?? "");
    setBabyName(primaryChild?.name ?? profile?.babyName ?? "");
    setMonthsOld(String(primaryChild?.monthsOld ?? profile?.babyMonthsOld ?? 0));
    setIsEditing(true);
  };
  const save = async () => {
    const parsedMonths = Number(monthsOld);
    if (!name.trim() || !babyName.trim() || !Number.isInteger(parsedMonths) || parsedMonths < 0) return;
    try {
      await update({ name: name.trim(), babyName: babyName.trim(), babyMonthsOld: parsedMonths });
      if (primaryChild && !childrenState.linkedMode) await childrenState.updateChild(primaryChild.id, { name: babyName.trim(), monthsOld: parsedMonths });
      setIsEditing(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const addChild = async () => {
    const parsedMonths = Number(newChildMonthsOld);
    try {
      await childrenState.addChild(newChildName, parsedMonths);
      setNewChildName("");
      setNewChildMonthsOld("");
      setIsAddingChild(false);
    } catch {
      // The hook exposes a recovery message in the screen.
    }
  };
  const openChildEditor = (child: ChildProfile) => {
    setEditingChild(child);
    setEditingChildName(child.name);
    setEditingChildMonthsOld(String(child.monthsOld));
    setEditingAllergies(child.allergies.join(", "));
    setEditingBabyFoodStartedOn(child.babyFoodStartedOn ?? "");
    setChildActionError(null);
  };
  const saveChildDetails = async () => {
    if (!editingChild) return;
    const months = Number(editingChildMonthsOld);
    const allergies = Array.from(new Set(editingAllergies.split(",").map((item) => item.trim()).filter(Boolean)));
    try {
      await childrenState.updateChild(editingChild.id, { name: editingChildName, monthsOld: months, allergies, babyFoodStartedOn: editingBabyFoodStartedOn.trim() || null });
      setEditingChild(null);
    } catch (caught) {
      setChildActionError(caught instanceof Error ? caught.message : "아이 정보를 저장하지 못했습니다.");
    }
  };
  const saveProfilePhoto = async () => {
    try {
      setIsPickingProfilePhoto(true);
      setProfilePhotoError(null);
      const photoDataUrl = await pickPhotoDataUrl();
      if (photoDataUrl) await update({ profileImageUrl: photoDataUrl });
    } catch (caught) {
      setProfilePhotoError(caught instanceof Error ? caught.message : "프로필 사진을 저장하지 못했습니다.");
    } finally {
      setIsPickingProfilePhoto(false);
    }
  };
  const saveChildPhoto = async () => {
    if (!editingChild) return;
    try {
      setIsPickingChildPhoto(true);
      setChildActionError(null);
      const photoDataUrl = await pickPhotoDataUrl();
      if (!photoDataUrl) return;
      await childrenState.updateChild(editingChild.id, { photoUrl: photoDataUrl });
      setEditingChild((current) => current ? { ...current, photoUrl: photoDataUrl } : current);
    } catch (caught) {
      setChildActionError(caught instanceof Error ? caught.message : "아이 사진을 저장하지 못했습니다.");
    } finally {
      setIsPickingChildPhoto(false);
    }
  };
  const deleteChild = async () => {
    if (!editingChild) return;
    try {
      setChildActionError(null);
      await childrenState.removeChild(editingChild.id);
      setEditingChild(null);
    } catch (caught) {
      setChildActionError(caught instanceof Error ? caught.message : "아이 정보를 삭제하지 못했습니다.");
    }
  };
  const sendPasswordReset = async () => {
    if (!profile?.email) {
      setAccountNoticeTone("error");
      setAccountNotice("비밀번호 재설정 메일을 보낼 이메일을 찾지 못했어요.");
      return;
    }
    try {
      setIsRequestingPasswordReset(true);
      setAccountNotice(null);
      await requestPasswordReset(profile.email);
      setAccountNoticeTone("success");
      setAccountNotice("비밀번호 재설정 메일을 보냈어요.");
    } catch (caught) {
      setAccountNoticeTone("error");
      setAccountNotice(caught instanceof Error ? caught.message : "비밀번호 재설정 메일을 보내지 못했습니다.");
    } finally {
      setIsRequestingPasswordReset(false);
    }
  };
  const openDeleteAccount = () => {
    setDeleteConfirmText("");
    setDeleteAccountError(null);
    setIsDeleteAccountOpen(true);
  };
  const removeAccount = async () => {
    try {
      setIsDeletingAccount(true);
      setDeleteAccountError(null);
      const message = await deleteAccount(deleteConfirmText);
      setAccountNoticeTone("success");
      setAccountNotice(message);
      setIsDeleteAccountOpen(false);
    } catch (caught) {
      setDeleteAccountError(caught instanceof Error ? caught.message : "회원탈퇴 처리에 실패했습니다.");
    } finally {
      setIsDeletingAccount(false);
    }
  };
  const confirmFamilyMemberUnlink = (member: { id: string; name: string }) => {
    Alert.alert("가족 연결을 해제할까요?", `${member.name}님은 더 이상 아이 식단을 함께 볼 수 없어요.`, [
      { text: "취소", style: "cancel" },
      { text: "연결 해제", style: "destructive", onPress: () => { void familyState.unlinkFamilyMember(member.id).catch(() => undefined); } },
    ]);
  };
  const copyInviteCode = async () => {
    if (!familyState.inviteCode) {
      setAccountNoticeTone("error");
      setAccountNotice("복사할 가족 코드가 없어요. 먼저 코드를 만들어주세요.");
      return;
    }
    try {
      await Clipboard.setStringAsync(familyState.inviteCode);
      setAccountNoticeTone("success");
      setAccountNotice("가족 코드를 복사했어요.");
    } catch (caught) {
      setAccountNoticeTone("error");
      setAccountNotice(caught instanceof Error ? caught.message : "가족 코드를 복사하지 못했습니다.");
    }
  };
  const openExternalUrl = async (url: string, failureMessage: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error(failureMessage);
      await Linking.openURL(url);
    } catch (caught) {
      setAccountNoticeTone("error");
      setAccountNotice(caught instanceof Error ? caught.message : failureMessage);
    }
  };
  const joinFamily = async () => {
    try {
      await familyState.joinFamily(joinCode, relationshipLabel);
      setJoinCode("");
    } catch (caught) {
      setAccountNoticeTone("error");
      setAccountNotice(caught instanceof Error ? caught.message : "가족 참여에 실패했습니다.");
    }
  };
  const signOutFromApp = async () => {
    try {
      await signOut();
    } catch (caught) {
      setAccountNoticeTone("error");
      setAccountNotice(caught instanceof Error ? caught.message : "로그아웃하지 못했습니다. 다시 시도해주세요.");
    }
  };
  return <ScreenScroll>
    <View style={s.myPage}>
      <View style={s.myPageHeader}><Text style={s.myPageTitle}>마이페이지</Text></View>
      {isLoading ? <View style={s.myInlineLoading}><ActivityIndicator color={colors.green} /><Text style={s.myInlineLoadingText}>프로필을 불러오고 있어요.</Text></View> : null}
      {error ? <View style={s.homeError}><Text style={s.homeErrorTitle}>프로필을 불러오지 못했어요.</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{error}</Text><Pressable onPress={() => void refresh()} style={s.retryButton}><Text style={s.retryButtonText}>다시 시도</Text></Pressable></View> : null}
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>보호자</Text>
        <Pressable accessibilityRole="button" onPress={startEditing} style={s.myGuardianRow}><Text style={s.myGuardianName}>{guardianName}<Text style={s.myGuardianSuffix}>님</Text></Text><Text style={s.myRowAction}>수정</Text></Pressable>
        {isEditing ? <View style={s.myEditPanel}><Text style={s.addMealTitle}>프로필 수정</Text><View style={s.photoPickerRow}><Avatar imageUrl={profile?.profileImageUrl} /><Pressable accessibilityRole="button" disabled={isSaving || isPickingProfilePhoto} onPress={() => void saveProfilePhoto()} style={[s.secondaryActionButton, (isSaving || isPickingProfilePhoto) && s.disabled]}><Camera color={colors.greenDeep} size={18} /><Text style={s.secondaryActionText}>{isPickingProfilePhoto ? "사진 저장 중" : "사진 변경"}</Text></Pressable></View>{profilePhotoError ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.formError}>{profilePhotoError}</Text> : null}<TextInput accessibilityLabel="보호자 이름" onChangeText={setName} placeholder="보호자 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={name} /><TextInput accessibilityLabel="아이 이름" onChangeText={setBabyName} placeholder="아이 이름" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={babyName} /><TextInput accessibilityLabel="아이 개월 수" keyboardType="number-pad" onChangeText={setMonthsOld} placeholder="아이 개월 수" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={monthsOld} /><Pressable disabled={isSaving || isPickingProfilePhoto} onPress={() => void save()} style={[s.saveMealButton, (isSaving || isPickingProfilePhoto) && s.disabled]}><Text style={s.saveMealButtonText}>{isSaving ? "저장 중이에요" : "프로필 저장"}</Text></Pressable></View> : null}
      </View>
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>아기 관리</Text>
        <Pressable accessibilityRole="button" onPress={() => setIsChildrenOpen(true)} style={s.myChildSummaryRow}>
          <View style={s.myChildAvatar}>{primaryChild?.photoUrl ? <Image accessibilityLabel="아이 사진" source={{ uri: primaryChild.photoUrl }} style={s.avatarImage} /> : <UserRound color={colors.greenDeep} size={28} />}</View>
          <View style={s.flex}><View style={s.myChildNameRow}><Text style={s.myChildName}>{primaryChild?.name ?? (childrenState.isLoading ? "아이 정보를 불러오는 중" : "아이 정보 추가")}</Text>{additionalChildCount > 0 ? <View style={s.myCountBadge}><Text style={s.myCountBadgeText}>+{additionalChildCount}</Text></View> : null}</View><Text style={s.myChildMeta}>{primaryChild ? `생후 ${primaryChild.monthsOld}개월` : childrenState.isLoading ? "잠시만 기다려주세요" : "아이 프로필을 등록해 주세요"}</Text></View>
          <ChevronRight color="#9aa39f" size={20} />
        </Pressable>
      </View>
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>알레르기 관리</Text>
        <Pressable accessibilityRole="button" onPress={() => setIsChildrenOpen(true)} style={s.myAllergyRow}><Text style={s.myAllergyTitle}>{primaryChild ? `${primaryChild.name}의 알레르기` : "알레르기 정보"}</Text>{childrenState.isLoading ? <Text style={s.myAllergyEmpty}>불러오는 중</Text> : allergies.length ? <View style={s.myAllergyChips}>{allergies.map((allergy) => <View key={allergy} style={s.myAllergyChip}><Text style={s.myAllergyChipText}>{allergy}</Text></View>)}</View> : <Text style={s.myAllergyEmpty}>등록된 알레르기가 없습니다.</Text>}</Pressable>
      </View>
      <View style={s.myWideBand} />
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>가족 관리</Text>
        <Pressable accessibilityRole="button" onPress={() => setIsFamilyOpen(true)} style={s.myFlatRow}><View style={s.flex}><Text style={s.myFlatRowTitle}>가족 연동</Text><Text style={s.myFlatRowDescription}>{familyState.isLoading ? "가족 정보를 불러오는 중" : familyState.members.length ? `연동 가족 ${familyState.members.length}명` : "함께 식단을 기록해 보세요"}</Text></View>{familyPreview.length ? <View style={s.myFamilyAvatars}>{familyPreview.map((member, index) => <View key={member.id} style={[s.myFamilyAvatar, { marginLeft: index === 0 ? 0 : -8 }]}><Text style={s.myFamilyAvatarText}>{member.name.slice(0, 1)}</Text></View>)}</View> : <ChevronRight color="#9aa39f" size={20} />}</Pressable>
      </View>
      <View style={s.myWideBand} />
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>지원</Text>
        <Pressable accessibilityRole="button" onPress={() => void openExternalUrl("mailto:support@nyampick.app", "문의 메일을 열 수 없어요.")} style={s.mySupportRow}><Text style={s.mySupportRowText}>개발팀에게 문의하기</Text><ChevronRight color="#9aa39f" size={19} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void openExternalUrl(`${mobileConfig.apiUrl ?? "https://www.nyampick.kr"}/privacy`, "개인정보 처리방침을 열 수 없어요.")} style={s.mySupportRow}><Text style={s.mySupportRowText}>개인정보 처리방침</Text><ChevronRight color="#9aa39f" size={19} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void openExternalUrl(`${mobileConfig.apiUrl ?? "https://www.nyampick.kr"}/terms`, "이용약관을 열 수 없어요.")} style={s.mySupportRow}><Text style={s.mySupportRowText}>이용약관</Text><ChevronRight color="#9aa39f" size={19} /></Pressable>
      </View>
      <View style={s.myWideBand} />
      <View style={s.myGroup}>
        <Text style={s.mySectionLabel}>계정</Text>
        {accountNotice ? <View style={[s.accountNotice, accountNoticeTone === "error" && s.accountNoticeError]}><Text style={[s.caption, accountNoticeTone === "error" && s.accountNoticeErrorText]}>{accountNotice}</Text></View> : null}
        <Pressable accessibilityRole="button" disabled={isRequestingPasswordReset} onPress={() => void sendPasswordReset()} style={[s.mySupportRow, isRequestingPasswordReset && s.disabled]}><Text style={s.mySupportRowText}>{isRequestingPasswordReset ? "재설정 메일 발송 중" : "비밀번호 재설정"}</Text><ChevronRight color="#9aa39f" size={19} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void signOutFromApp()} style={s.mySupportRow}><Text style={s.mySupportRowText}>로그아웃</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={openDeleteAccount} style={s.mySupportRow}><Text style={s.myDangerRowText}>회원탈퇴</Text></Pressable>
        <Text style={s.myVersion}>v1.0.0</Text>
      </View>
    </View>
    <NativeSheet onClose={() => setIsChildrenOpen(false)} title="아이 정보" visible={isChildrenOpen}><View style={s.sheetContent}>{childrenState.isLoading ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>아이 정보를 불러오고 있어요.</Text></View> : null}{childrenState.error ? <View style={s.homeError}><Text style={s.homeErrorTitle}>아이 정보를 불러오지 못했어요.</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{childrenState.error}</Text><Pressable onPress={() => void childrenState.refresh()} style={s.retryButton}><Text style={s.retryButtonText}>다시 시도</Text></Pressable></View> : null}{childrenState.children.map((child) => <View key={child.id} style={[s.childRow, child.isPrimary && s.childRowSelected]}><Avatar imageUrl={child.photoUrl} small /><Pressable accessibilityRole="button" disabled={childrenState.linkedMode || child.isPrimary} onPress={() => { void childrenState.updateChild(child.id, { isPrimary: true }).catch(() => undefined); }} style={s.flex}><Text style={s.ingredientName}>{child.name}</Text><Text style={s.caption}>{child.monthsOld}개월 · {child.allergies.length ? `알레르기 ${child.allergies.join(", ")}` : "등록된 알레르기 없음"}</Text></Pressable><Pressable accessibilityLabel="아이 정보 수정" disabled={childrenState.linkedMode} onPress={() => openChildEditor(child)} style={s.sheetIconButton}><Pencil color={colors.greenDeep} size={18} /></Pressable><Text style={s.recipeAction}>{child.isPrimary ? "선택됨" : childrenState.linkedMode ? "공유 중" : "선택"}</Text></View>)}{isAddingChild ? <View style={s.addMealCard}><Text style={s.addMealTitle}>아이 추가</Text><TextInput accessibilityLabel="아이 이름" onChangeText={setNewChildName} placeholder="아이 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={newChildName} /><TextInput accessibilityLabel="아이 개월 수" keyboardType="number-pad" onChangeText={setNewChildMonthsOld} placeholder="개월 수" placeholderTextColor={colors.tertiary} style={[s.mealInput, s.secondaryInput]} value={newChildMonthsOld} /><Pressable disabled={childrenState.isSaving || !newChildName.trim() || !newChildMonthsOld.trim()} onPress={() => void addChild()} style={[s.saveMealButton, (childrenState.isSaving || !newChildName.trim() || !newChildMonthsOld.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{childrenState.isSaving ? "추가 중이에요" : "아이 추가"}</Text></Pressable></View> : null}{!childrenState.linkedMode && !isAddingChild ? <Button label="아이 추가" onPress={() => setIsAddingChild(true)} icon={<Plus color={colors.onGreen} size={20} />} /> : null}</View></NativeSheet>
    <NativeSheet onClose={() => setEditingChild(null)} title="아이 식단 설정" visible={Boolean(editingChild)}><View style={s.sheetContent}><View style={s.photoPickerRow}><Avatar imageUrl={editingChild?.photoUrl} /><Pressable accessibilityRole="button" disabled={childrenState.isSaving || isPickingChildPhoto} onPress={() => void saveChildPhoto()} style={[s.secondaryActionButton, (childrenState.isSaving || isPickingChildPhoto) && s.disabled]}><Camera color={colors.greenDeep} size={18} /><Text style={s.secondaryActionText}>{isPickingChildPhoto ? "사진 저장 중" : "사진 변경"}</Text></Pressable></View><Text style={s.inputLabel}>아이 이름</Text><TextInput accessibilityLabel="아이 이름" onChangeText={setEditingChildName} placeholder="아이 이름" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingChildName} /><Text style={[s.inputLabel, s.secondaryInput]}>개월 수</Text><TextInput accessibilityLabel="아이 개월 수" keyboardType="number-pad" onChangeText={setEditingChildMonthsOld} placeholder="개월 수" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingChildMonthsOld} /><Text style={[s.inputLabel, s.secondaryInput]}>이유식 시작일</Text><TextInput accessibilityLabel="이유식 시작일" autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setEditingBabyFoodStartedOn} placeholder="YYYY-MM-DD (선택)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingBabyFoodStartedOn} /><Text style={[s.inputLabel, s.secondaryInput]}>알레르기</Text><TextInput accessibilityLabel="알레르기" onChangeText={setEditingAllergies} placeholder="예: 우유, 달걀 (쉼표로 구분)" placeholderTextColor={colors.tertiary} style={s.mealInput} value={editingAllergies} /><Text style={s.caption}>등록한 알레르기는 식단 확인에 사용돼요.</Text>{childActionError ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.formError}>{childActionError}</Text> : null}<Pressable disabled={childrenState.isSaving || isPickingChildPhoto || !editingChildName.trim() || !editingChildMonthsOld.trim()} onPress={() => void saveChildDetails()} style={[s.saveMealButton, (childrenState.isSaving || isPickingChildPhoto || !editingChildName.trim() || !editingChildMonthsOld.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{childrenState.isSaving ? "저장 중이에요" : "설정 저장"}</Text></Pressable><Pressable disabled={childrenState.isSaving || isPickingChildPhoto} onPress={() => void deleteChild()} style={[s.deleteButton, (childrenState.isSaving || isPickingChildPhoto) && s.disabled]}><Trash2 color="#b91c1c" size={18} /><Text style={s.deleteButtonText}>아이 삭제</Text></Pressable></View></NativeSheet>
    <NativeSheet onClose={() => setIsFamilyOpen(false)} title="가족 연결" visible={isFamilyOpen}><View style={s.sheetContent}>{familyState.isLoading ? <View style={s.homeLoading}><ActivityIndicator color={colors.green} /><Text style={s.homeLoadingText}>가족 정보를 불러오고 있어요.</Text></View> : null}{familyState.error ? <View style={s.homeError}><Text style={s.homeErrorTitle}>가족 정보를 불러오지 못했어요.</Text><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={s.homeErrorText}>{familyState.error}</Text><Pressable onPress={() => void familyState.refresh()} style={s.retryButton}><Text style={s.retryButtonText}>다시 시도</Text></Pressable></View> : null}{familyState.members.map((member) => <View key={member.id} style={s.childRow}><View style={s.avatarSmall}><UserRound color={colors.greenDeep} size={22} /></View><View style={s.flex}><Text style={s.ingredientName}>{member.name}</Text><Text style={s.caption}>{member.roleLabel}</Text></View>{!familyState.linkedMode && member.role === "member" ? <Pressable accessibilityLabel={`${member.name} 가족 연결 해제`} disabled={familyState.isSaving} onPress={() => confirmFamilyMemberUnlink(member)} style={[s.sheetIconButton, familyState.isSaving && s.disabled]}><Trash2 color="#b91c1c" size={18} /></Pressable> : null}</View>)}{familyState.linkedMode ? <Pressable disabled={familyState.isSaving} onPress={() => { void familyState.unlinkFamily().catch(() => undefined); }} style={s.deleteButton}><Text style={s.deleteButtonText}>{familyState.isSaving ? "해제 중이에요" : "가족 연결 해제"}</Text></Pressable> : <><Text style={[s.inputLabel, s.secondaryInput]}>내 가족 코드</Text><View style={s.codeRow}><Text style={s.codeValue}>{familyState.inviteCode ?? "코드를 만들어 공유하세요"}</Text><Pressable accessibilityLabel="가족 코드 복사" disabled={familyState.isSaving || !familyState.inviteCode} onPress={() => void copyInviteCode()} style={[s.codeButton, (familyState.isSaving || !familyState.inviteCode) && s.disabled]}><Copy color={colors.greenDeep} size={18} /></Pressable><Pressable disabled={familyState.isSaving} onPress={() => { void familyState.createInviteCode().catch(() => undefined); }} style={s.codeButton}><Text style={s.secondaryActionText}>{familyState.isSaving ? "생성 중" : "코드 만들기"}</Text></Pressable></View><Text style={[s.inputLabel, s.secondaryInput]}>가족 코드로 참여</Text><TextInput accessibilityLabel="가족 코드" autoCapitalize="characters" onChangeText={setJoinCode} placeholder="가족 코드 입력" placeholderTextColor={colors.tertiary} style={s.mealInput} value={joinCode} /><View style={s.categoryChipRow}>{["배우자", "가족", "친구", "도우미"].map((label) => <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: relationshipLabel === label }} onPress={() => setRelationshipLabel(label)} style={[s.mealTypeChip, relationshipLabel === label && s.mealTypeChipSelected]}><Text style={[s.mealTypeChipText, relationshipLabel === label && s.mealTypeChipTextSelected]}>{label}</Text></Pressable>)}</View><Pressable disabled={familyState.isSaving || !joinCode.trim()} onPress={() => void joinFamily()} style={[s.saveMealButton, (familyState.isSaving || !joinCode.trim()) && s.disabled]}><Text style={s.saveMealButtonText}>{familyState.isSaving ? "참여 중이에요" : "가족 참여"}</Text></Pressable></>}</View></NativeSheet>
    <NativeSheet onClose={() => { if (!isDeletingAccount) setIsDeleteAccountOpen(false); }} title="회원탈퇴" visible={isDeleteAccountOpen}><View style={s.sheetContent}><View style={s.accountDeleteWarning}><Text style={s.accountDeleteWarningTitle}>삭제된 데이터는 복구할 수 없어요.</Text><Text style={s.accountDeleteWarningText}>식단, 냉장고, 저장한 레시피와 가족 연동 정보가 모두 삭제됩니다.</Text></View><Text style={[s.inputLabel, s.secondaryInput]}>계속하려면 아래에 회원탈퇴를 입력해주세요.</Text><TextInput accessibilityLabel="회원탈퇴 확인" autoCapitalize="none" editable={!isDeletingAccount} onChangeText={setDeleteConfirmText} placeholder="회원탈퇴" placeholderTextColor={colors.tertiary} style={s.mealInput} value={deleteConfirmText} />{deleteAccountError ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.formError, s.secondaryInput]}>{deleteAccountError}</Text> : null}<View style={s.sheetSplitActions}><Pressable disabled={isDeletingAccount} onPress={() => setIsDeleteAccountOpen(false)} style={[s.secondaryActionButton, isDeletingAccount && s.disabled]}><Text style={s.secondaryActionText}>취소</Text></Pressable><Pressable disabled={isDeletingAccount || deleteConfirmText !== "회원탈퇴"} onPress={() => void removeAccount()} style={[s.destructiveActionButton, (isDeletingAccount || deleteConfirmText !== "회원탈퇴") && s.disabled]}><Text style={s.destructiveActionText}>{isDeletingAccount ? "탈퇴 처리 중" : "탈퇴하기"}</Text></Pressable></View></View></NativeSheet>
  </ScreenScroll>;
}

function TabBar({ activeTab, setTab }: { activeTab: Tab; setTab: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{tabs.map((tab) => { const TabIcon = tab.icon; const active = tab.id === activeTab; return <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setTab(tab.id)} style={s.tab}><TabIcon color={active ? colors.green : colors.tertiary} size={23} strokeWidth={active ? 2.3 : 1.8} /><Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text></Pressable>; })}</View>;
}

function MobileApp() {
  const [activeTab, setActiveTab] = useState<Tab>("meal");
  const auth = useAuth();
  const entryScreen = resolveMobileEntryScreen({
    authStatus: auth.status,
    isAuthenticated: auth.isAuthenticated,
    isOnboardingRequired: auth.isOnboardingRequired,
    isPasswordRecovery: auth.isPasswordRecovery,
  });
  if (entryScreen === "loading") {
    return <View accessibilityLabel="식단 준비 중" accessibilityLiveRegion="polite" style={s.authLoading}><StatusBar style="dark" /><ActivityIndicator color={colors.green} size="large" /><Text style={s.authLoadingText}>식단을 준비하고 있어요.</Text></View>;
  }
  if (entryScreen === "auth") return <AuthScreen />;
  if (entryScreen === "onboarding") return <OnboardingScreen />;
  const screen: Record<Tab, ReactNode> = { meal: <MealScreen onManageChild={() => setActiveTab("my")} />, fridge: <FridgeWebScreen />, recipe: <RecipeWebScreen />, my: <MyScreen /> };
  return <SafeAreaView style={s.safeArea} edges={["top"]}><StatusBar style="dark" /><View style={s.screen}>{screen[activeTab]}</View><TabBar activeTab={activeTab} setTab={setActiveTab} /></SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><AuthProvider><MobileApp /></AuthProvider></SafeAreaProvider>; }

const shadow: ViewStyle = { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 };
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingBottom: 24 },
  authLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colors.canvas }, authLoadingText: { color: colors.secondary, fontSize: font.body, fontWeight: "400", lineHeight: 26, letterSpacing: 0 },
  header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerTitle: { color: colors.foreground, fontSize: 17, fontWeight: "600", lineHeight: 24 }, headerAction: { minWidth: 44, alignItems: "flex-end" }, headerIconRow: { flexDirection: "row" }, iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  mealHomeHero: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: "#f3f8f4" }, mealHomeHeader: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, mealGreeting: { color: "#6f7875", fontSize: 14, fontWeight: "400", lineHeight: 22 }, mealHomeTitle: { color: "#1f2725", fontSize: font.section, fontWeight: "700", lineHeight: 31, marginTop: 4 },
  childSummaryCard: { minHeight: 112, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.surface, borderRadius: 22 }, childSummaryName: { color: "#26302d", fontSize: 18, fontWeight: "700", lineHeight: 24 }, childSummaryMeta: { color: "#77807d", fontSize: 15, fontWeight: "500", lineHeight: 22, marginTop: 2 }, childSummaryDay: { color: colors.green, fontSize: 13, fontWeight: "600", lineHeight: 20, marginTop: 2 }, childManageButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: colors.green, borderRadius: radius.md }, childManageButtonText: { color: colors.onGreen, fontSize: 13, fontWeight: "600", lineHeight: 20 }, avatarChild: { width: 72, height: 72, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 18, backgroundColor: colors.greenTint }, mealProfileLoading: { minHeight: 144, alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16, backgroundColor: colors.surface, borderRadius: 22 },
  mealCalendarCard: { marginTop: 16, padding: 16, backgroundColor: colors.surface, borderRadius: 22 }, mealCalendarHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, mealCalendarHeaderActions: { flexDirection: "row", alignItems: "center" }, mealCalendarTitle: { color: "#232a28", fontSize: 18, fontWeight: "700", lineHeight: 24 }, calendarModeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, weekCalendarRow: { flexDirection: "row", gap: 2 }, weekCalendarDay: { flex: 1, minHeight: 96, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 12 }, monthWeekdayRow: { flexDirection: "row", marginBottom: 4 }, monthWeekday: { width: "14.2857%", color: "#7a8380", fontSize: 11, fontWeight: "500", lineHeight: 18, textAlign: "center" }, monthCalendarGrid: { flexDirection: "row", flexWrap: "wrap" }, monthCalendarDay: { width: "14.2857%", height: 54, alignItems: "center", justifyContent: "center", borderRadius: 12 }, monthCalendarBlank: { width: "14.2857%", height: 54 }, calendarDaySelected: { backgroundColor: colors.green }, calendarDayToday: { backgroundColor: colors.greenTint }, calendarWeekday: { color: "#7a8380", fontSize: 12, fontWeight: "500", lineHeight: 18 }, calendarDate: { color: "#26302d", fontSize: 16, fontWeight: "700", lineHeight: 22, marginTop: 2 }, calendarTextSelected: { color: colors.onGreen }, weekMarkerStack: { height: 17, justifyContent: "space-between", marginTop: 4 }, weekMarker: { width: 16, height: 3, borderRadius: radius.pill, backgroundColor: "transparent" }, monthMarkerRow: { height: 7, flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }, monthMarker: { width: 4, height: 4, borderRadius: radius.pill, backgroundColor: "transparent" }, markerActive: { backgroundColor: "#9bdcbc" }, markerSelected: { backgroundColor: "rgba(255,255,255,0.72)" }, mealOverviewButton: { minHeight: 36, alignSelf: "flex-end", justifyContent: "center", marginTop: 4, paddingHorizontal: 4 }, mealOverviewText: { color: colors.green, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  mealHomeBody: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24, backgroundColor: colors.surface, borderTopColor: "#7bc8a3", borderTopWidth: 1 }, mealDayHeader: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, mealSelectedDate: { color: "#7f8885", fontSize: 14, fontWeight: "400", lineHeight: 22 }, mealDayTitle: { color: "#242b29", fontSize: 24, fontWeight: "700", lineHeight: 31, marginTop: 4 }, mealCardsLoading: { minHeight: 224, alignItems: "center", justifyContent: "center", gap: 12 }, webMealStack: { gap: 20 }, webMealCard: { minHeight: 108, paddingHorizontal: 16, paddingVertical: 14, borderColor: "#c8cfcd", borderWidth: 1, borderRadius: 14, backgroundColor: colors.surface }, webMealCardTitle: { color: "#252c2a", fontSize: 18, fontWeight: "700", lineHeight: 24 }, webMealEntries: { gap: 6, paddingLeft: 10, marginTop: 12 }, webMealEntry: { minHeight: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, webMealEntryName: { flex: 1, color: "#2a312f", fontSize: 16, fontWeight: "500", lineHeight: 26 }, webMealEmpty: { color: "#6e7673", fontSize: 17, fontWeight: "400", lineHeight: 27, marginTop: 14 },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 24 }, heroCopy: { flex: 1 }, eyebrow: { color: colors.secondary, fontSize: font.caption, lineHeight: 20, marginBottom: 4 }, heroTitle: { color: colors.foreground, fontSize: 28, fontWeight: "700", lineHeight: 35 }, heroDescription: { color: colors.secondary, fontSize: font.caption, lineHeight: 20, marginTop: 8 }, avatar: { width: 64, height: 64, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 32, backgroundColor: colors.greenTint }, heroAvatar: { marginLeft: 16 }, avatarImage: { width: "100%", height: "100%" },
  summaryCard: { ...shadow, minHeight: 96, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, summaryLabel: { color: colors.secondary, fontSize: font.micro, fontWeight: "500", lineHeight: 17, marginBottom: 4 }, summaryValue: { color: colors.foreground, fontSize: 24, fontWeight: "700", lineHeight: 31 }, summaryUnit: { color: colors.secondary, fontSize: font.caption, fontWeight: "500" }, summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 32, marginBottom: 12 }, sectionTitle: { color: colors.foreground, fontSize: font.cardTitle, fontWeight: "600", lineHeight: 27 }, sectionAction: { minHeight: 44, flexDirection: "row", alignItems: "center" }, sectionActionText: { color: colors.green, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, stack: { gap: 12 },
  mealCard: { ...shadow, minHeight: 128, padding: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, cardPressed: { backgroundColor: colors.greenSubtle }, mealTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.greenTint, borderRadius: radius.pill }, badgeText: { color: colors.greenDeep, fontSize: font.micro, fontWeight: "600", lineHeight: 17 }, mealName: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26, marginBottom: 4 }, caption: { color: colors.secondary, fontSize: font.caption, lineHeight: 20 },
  quickRow: { flexDirection: "row", gap: 12, marginTop: 32 }, quickAction: { flex: 1, minHeight: 100, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg }, quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.greenTint }, aiIcon: { backgroundColor: colors.aiIconBackground }, quickLabel: { color: colors.foreground, fontSize: font.micro, fontWeight: "600", lineHeight: 17 },
  notice: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginTop: 32, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg }, warningIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#fef3c7" }, flex: { flex: 1 }, noticeTitle: { color: colors.foreground, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, noticeDescription: { color: colors.secondary, fontSize: font.micro, lineHeight: 17, marginTop: 2 },
  homeLoading: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16, marginBottom: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg }, homeLoadingText: { color: colors.secondary, fontSize: font.caption, fontWeight: "400", lineHeight: 20 }, homeError: { padding: 16, marginBottom: 16, backgroundColor: "#fff1f2", borderColor: "#fecdd3", borderWidth: 1, borderRadius: radius.lg }, homeErrorTitle: { color: "#b91c1c", fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, homeErrorText: { color: "#b91c1c", fontSize: font.caption, fontWeight: "400", lineHeight: 20, marginTop: 4 }, retryButton: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 8, paddingHorizontal: 8 }, retryButtonText: { color: colors.greenDeep, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, recipeSuccessNotice: { padding: 12, marginTop: 12, marginBottom: 16, backgroundColor: colors.greenSubtle, borderColor: colors.greenTint, borderWidth: 1, borderRadius: radius.lg }, recipeSuccessNoticeText: { color: colors.greenDeep, fontSize: font.caption, fontWeight: "600", lineHeight: 20 },
  dateCard: { padding: 16, marginTop: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, dateMonth: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26, marginBottom: 8 }, weekPicker: { position: "relative" }, weekNavigation: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: -8 }, weekNavigationButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, weekRow: { flexDirection: "row", justifyContent: "space-between" }, dayCell: { width: 36, alignItems: "center", gap: 8 }, dayLabel: { color: colors.secondary, fontSize: font.micro, fontWeight: "500", lineHeight: 17 }, dateCircle: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 }, dateSelected: { backgroundColor: colors.green }, dateText: { color: colors.foreground, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, dateTextSelected: { color: colors.onGreen },
  addMealCard: { padding: 16, marginTop: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, addMealTitle: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26, marginBottom: 12 }, mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 12 }, mealTypeChip: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm }, mealTypeChipSelected: { backgroundColor: colors.greenTint }, mealTypeChipText: { color: colors.secondary, fontSize: font.caption, fontWeight: "500", lineHeight: 20 }, mealTypeChipTextSelected: { color: colors.greenDeep, fontWeight: "600" }, mealInput: { minHeight: 52, paddingHorizontal: 16, color: colors.foreground, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, fontSize: font.body, fontWeight: "400", lineHeight: 26 }, secondaryInput: { marginTop: 8 }, saveMealButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 12, backgroundColor: colors.green, borderRadius: radius.md }, saveMealButtonText: { color: colors.onGreen, fontSize: font.body, fontWeight: "600", lineHeight: 26 }, disabled: { opacity: 0.45 },
  button: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, marginTop: 24, backgroundColor: colors.green, borderRadius: radius.md }, buttonPressed: { backgroundColor: colors.greenDeep }, buttonText: { color: colors.onGreen, fontSize: font.body, fontWeight: "600", lineHeight: 26 },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: "#000" }, sheetScrimPressable: { ...StyleSheet.absoluteFill }, sheetKeyboard: { ...StyleSheet.absoluteFill }, sheet: { position: "absolute", right: 0, bottom: 0, left: 0, maxHeight: "86%", paddingHorizontal: 16, paddingBottom: 24, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 12 }, sheetHandle: { width: 36, height: 4, alignSelf: "center", marginTop: 8, marginBottom: 8, backgroundColor: colors.border, borderRadius: radius.pill }, sheetHeader: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sheetTitle: { color: colors.foreground, fontSize: font.cardTitle, fontWeight: "600", lineHeight: 27 }, sheetClose: { color: colors.greenDeep, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, sheetScrollContent: { paddingBottom: 8 }, sheetContent: { paddingTop: 12, paddingBottom: 8 }, sheetListItem: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }, sheetActions: { flexDirection: "row", gap: 8 }, sheetIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, sheetIconButtonSelected: { backgroundColor: colors.green }, inputLabel: { color: colors.secondary, fontSize: font.caption, fontWeight: "600", lineHeight: 20, marginBottom: 8 }, deleteButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, borderColor: "#fecdd3", borderWidth: 1, borderRadius: radius.md }, deleteButtonText: { color: "#b91c1c", fontSize: font.body, fontWeight: "600", lineHeight: 26 }, sheetSplitActions: { flexDirection: "row", gap: 8, marginTop: 12 }, secondaryActionButton: { minHeight: 52, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md }, fullWidthAction: { marginTop: 8 }, secondaryActionText: { color: colors.greenDeep, fontSize: font.caption, fontWeight: "600", lineHeight: 20 },
  fridgeScreen: { flex: 1, backgroundColor: "#eef3f0" }, fridgeFixedHeader: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.surface, borderBottomColor: "#d3d7d5", borderBottomWidth: 1 }, fridgePageTitleRow: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, fridgePageTitle: { color: "#1f2725", fontSize: font.section, fontWeight: "700", lineHeight: 31 }, fridgeHeaderAction: { minWidth: 84, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }, fridgeHeaderActionText: { color: colors.green, fontSize: 13, fontWeight: "600", lineHeight: 20 }, webSearchField: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: "#eef0ef", borderRadius: radius.xl }, webSearchInput: { flex: 1, minHeight: 52, color: colors.foreground, fontSize: 18, fontWeight: "500", lineHeight: 26 }, webCategoryChips: { gap: 8, paddingTop: 16 }, fridgeSectionContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 104 }, fridgeSectionHeader: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 8 }, fridgeSectionTitle: { color: "#2a4a3c", fontSize: 18, fontWeight: "700", lineHeight: 24 }, webFridgeItemCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 10, borderColor: "#c2d8cc", borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface }, webFridgeItemName: { color: "#1f2725", fontSize: 18, fontWeight: "600", lineHeight: 26 }, webFridgeItemMeta: { color: colors.secondary, fontSize: 12, fontWeight: "500", lineHeight: 18, marginTop: 2 }, webFridgeItemQuantity: { color: "#2f8d68", fontSize: 20, fontWeight: "700", lineHeight: 28 }, fridgeFloatingAdd: { position: "absolute", right: 16, bottom: 16, left: 16, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.green, borderRadius: radius.md, shadowColor: colors.green, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, fridgeFloatingAddText: { color: colors.onGreen, fontSize: 16, fontWeight: "600", lineHeight: 26 }, webEmptyFridge: { alignItems: "center", justifyContent: "center", gap: 8, padding: 24, marginTop: 24, borderColor: "#c8cfcd", borderWidth: 1, borderStyle: "dashed", borderRadius: radius.lg, backgroundColor: "#f6f8f7" }, webEmptyFridgeTitle: { color: "#2d3532", fontSize: 18, fontWeight: "600", lineHeight: 26 }, webEmptyFridgeDescription: { color: "#6f7875", fontSize: 14, fontWeight: "400", lineHeight: 22, textAlign: "center" }, webEmptyActions: { flexDirection: "row", gap: 8, marginTop: 12 }, emptySecondaryButton: { minWidth: 128, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderColor: "#7bcaa3", borderWidth: 1, borderRadius: radius.md, backgroundColor: "#eef8f2" }, emptySecondaryButtonText: { color: "#2f7f59", fontSize: 14, fontWeight: "600", lineHeight: 20 }, emptyPrimaryButton: { minWidth: 128, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.green }, emptyPrimaryButtonText: { color: colors.onGreen, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  fridgeIntro: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }, fridgeTitle: { color: colors.foreground, fontSize: font.cardTitle, fontWeight: "600", lineHeight: 27 }, greenText: { color: colors.greenDeep, fontWeight: "700" }, addButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.green }, chipScroller: { marginTop: 24, marginBottom: 12 }, chips: { flexDirection: "row", gap: 8 }, searchField: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md }, searchInput: { flex: 1, minHeight: 52, color: colors.foreground, fontSize: font.body, fontWeight: "400", lineHeight: 26 }, categoryChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill }, chipSelected: { backgroundColor: colors.greenTint, borderColor: colors.greenTint }, chipText: { color: colors.secondary, fontSize: font.caption, fontWeight: "500", lineHeight: 20 }, chipTextSelected: { color: colors.greenDeep, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 }, listCard: { ...shadow, overflow: "hidden", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, listCardTop: { height: 1, marginTop: 0, backgroundColor: colors.border, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }, listCardMiddle: { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 1, borderRightWidth: 1 }, listCardBottom: { height: 1, backgroundColor: colors.border, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }, emptyCard: { alignItems: "center", padding: 24, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, emptyTitle: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26, marginBottom: 4 }, ingredient: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, receiptCandidate: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, marginTop: 8, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface }, checkmark: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm }, checkmarkSelected: { backgroundColor: colors.green, borderColor: colors.green }, checkmarkText: { color: colors.onGreen, fontSize: font.caption, fontWeight: "700", lineHeight: 20 }, divider: { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }, ingredientIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.greenTint }, ingredientName: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26 }, due: { color: colors.secondary, fontSize: font.micro, fontWeight: "500", lineHeight: 17 }, dueUrgent: { color: "#b45309" },
  recipeHero: { ...shadow, alignItems: "center", padding: 24, marginTop: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, recipeAiIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: colors.aiIconBackground, marginBottom: 12 }, recipeHeroTitle: { color: colors.foreground, fontSize: font.cardTitle, fontWeight: "600", lineHeight: 27, textAlign: "center" }, recipeHeroDescription: { color: colors.secondary, fontSize: font.caption, lineHeight: 20, textAlign: "center", marginTop: 8 }, recipeRecommendationProgress: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16, marginBottom: 12, backgroundColor: colors.greenSubtle, borderColor: colors.greenTint, borderWidth: 1, borderRadius: radius.lg }, recipeRecommendationProgressText: { flex: 1, color: colors.greenDeep, fontSize: font.caption, fontWeight: "500", lineHeight: 20 }, recipeSearchInput: { minHeight: 52, paddingHorizontal: 16, marginBottom: 8, color: colors.foreground, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, fontSize: font.body, fontWeight: "400", lineHeight: 26 }, multilineInput: { minHeight: 100, paddingTop: 12 }, recipeCard: { ...shadow, minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, recipeListItem: { marginBottom: 12 }, recipeThumb: { width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: colors.greenTint }, recipeName: { color: colors.foreground, fontSize: font.body, fontWeight: "600", lineHeight: 26, marginBottom: 2 }, recipeAction: { color: colors.greenDeep, fontSize: font.micro, fontWeight: "600", lineHeight: 17 },
  recipeScreen: { flex: 1, backgroundColor: colors.canvas }, recipeListContent: { paddingBottom: 104 }, recipePageHeader: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.surface, borderBottomColor: "#d3d7d5", borderBottomWidth: 1 }, recipePageTitleRow: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, recipePageTitle: { color: "#1f2725", fontSize: font.section, fontWeight: "700", lineHeight: 31 }, recipeNewHeaderAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4 }, recipeNewHeaderActionText: { color: colors.green, fontSize: 13, fontWeight: "600", lineHeight: 20 }, recipeWebTabs: { flexDirection: "row", marginTop: 14, borderBottomColor: "#e1e5e3", borderBottomWidth: 1 }, recipeWebTab: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginRight: 8, borderBottomColor: "transparent", borderBottomWidth: 2 }, recipeWebTabActive: { borderBottomColor: colors.green }, recipeWebTabText: { color: "#7a8380", fontSize: 14, fontWeight: "500", lineHeight: 20 }, recipeWebTabTextActive: { color: "#245b42", fontWeight: "700" }, webRecipeCard: { minHeight: 128, flexDirection: "row", alignItems: "stretch", marginHorizontal: 16, marginTop: 12, borderColor: "#d9e1dc", borderWidth: 1, borderRadius: 14, backgroundColor: colors.surface }, webRecipeCardAi: { borderColor: "#bee0cc", backgroundColor: "#fbfefc" }, webRecipeCardPressable: { flex: 1, justifyContent: "center", paddingHorizontal: 18, paddingVertical: 16 }, webRecipeCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 }, webRecipeCardTitle: { flexShrink: 1, color: "#25302c", fontSize: 18, fontWeight: "700", lineHeight: 26 }, webRecipeCardDescription: { color: "#6f7875", fontSize: 14, fontWeight: "400", lineHeight: 21, marginTop: 5 }, webRecipeTags: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 }, webRecipeTag: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.greenTint, borderRadius: radius.pill }, webRecipeTagText: { color: colors.greenDeep, fontSize: 11, fontWeight: "600", lineHeight: 16 }, webRecipeSource: { color: "#87908d", fontSize: 11, fontWeight: "500", lineHeight: 17 }, webRecipeAiBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: colors.greenTint, borderRadius: radius.pill }, webRecipeAiBadgeText: { color: colors.greenDeep, fontSize: 10, fontWeight: "700", lineHeight: 15 }, webRecipeSideAction: { width: 56, alignItems: "center", justifyContent: "center", borderLeftColor: "#e5ebe7", borderLeftWidth: StyleSheet.hairlineWidth }, webRecipeSaveText: { color: colors.greenDeep, fontSize: 13, fontWeight: "700", lineHeight: 20 }, webRecipeEmpty: { alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 48, margin: 16, borderColor: "#c8cfcd", borderWidth: 1, borderStyle: "dashed", borderRadius: radius.lg, backgroundColor: "#f6f8f7" }, webRecipeEmptyTitle: { color: "#2d3532", fontSize: 18, fontWeight: "600", lineHeight: 26, textAlign: "center" }, webRecipeEmptyDescription: { color: "#6f7875", fontSize: 14, fontWeight: "400", lineHeight: 22, textAlign: "center" }, recommendationSubmitButton: { flexDirection: "row", gap: 8 }, recipeBottomActions: { position: "absolute", right: 16, bottom: 12, left: 16, minHeight: 52, flexDirection: "row", gap: 8 }, recipeAiCta: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.green, borderRadius: radius.md, shadowColor: colors.green, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, recipeAiCtaText: { color: colors.onGreen, fontSize: 15, fontWeight: "700", lineHeight: 22 }, recipeAddCta: { minWidth: 118, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderColor: "#9ecdb1", borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface }, recipeAddCtaText: { color: colors.greenDeep, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  myPage: { marginHorizontal: -16, paddingBottom: 28, backgroundColor: colors.surface }, myPageHeader: { minHeight: 76, justifyContent: "center", paddingHorizontal: 20 }, myPageTitle: { color: "#1f2725", fontSize: font.section, fontWeight: "700", lineHeight: 31 }, myInlineLoading: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, backgroundColor: "#f4faf6" }, myInlineLoadingText: { color: colors.secondary, fontSize: 13, fontWeight: "500", lineHeight: 20 }, myGroup: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }, mySectionLabel: { color: colors.green, fontSize: 16, fontWeight: "700", lineHeight: 24, marginBottom: 6 }, myGuardianRow: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomColor: "#e8ecea", borderBottomWidth: StyleSheet.hairlineWidth }, myGuardianName: { color: "#28302e", fontSize: 20, fontWeight: "600", lineHeight: 28 }, myGuardianSuffix: { color: "#858d8a", fontSize: 16, fontWeight: "400" }, myRowAction: { color: colors.green, fontSize: 14, fontWeight: "600", lineHeight: 20 }, myEditPanel: { padding: 16, marginTop: 12, marginBottom: 8, backgroundColor: "#f7faf8", borderColor: "#d8e8de", borderWidth: 1, borderRadius: radius.md }, myChildSummaryRow: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 14, borderBottomColor: "#e8ecea", borderBottomWidth: StyleSheet.hairlineWidth }, myChildAvatar: { width: 65, height: 65, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 20, backgroundColor: colors.greenTint }, myChildNameRow: { flexDirection: "row", alignItems: "center", gap: 7 }, myChildName: { color: "#28302e", fontSize: 18, fontWeight: "600", lineHeight: 26 }, myChildMeta: { color: "#78817e", fontSize: 15, fontWeight: "400", lineHeight: 22, marginTop: 2 }, myCountBadge: { minWidth: 24, minHeight: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, backgroundColor: colors.greenTint, borderRadius: radius.pill }, myCountBadgeText: { color: colors.greenDeep, fontSize: 11, fontWeight: "700", lineHeight: 16 }, myAllergyRow: { minHeight: 76, justifyContent: "center", paddingBottom: 12, borderBottomColor: "#e8ecea", borderBottomWidth: StyleSheet.hairlineWidth }, myAllergyTitle: { color: "#2d3532", fontSize: 16, fontWeight: "600", lineHeight: 24 }, myAllergyChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 }, myAllergyChip: { paddingHorizontal: 9, paddingVertical: 3, backgroundColor: "#fff5e7", borderRadius: radius.pill }, myAllergyChipText: { color: "#a06415", fontSize: 12, fontWeight: "600", lineHeight: 18 }, myAllergyEmpty: { color: "#7d8582", fontSize: 14, fontWeight: "400", lineHeight: 21, marginTop: 4 }, myWideBand: { height: 8, marginHorizontal: -20, marginTop: 12, backgroundColor: "#f1f3f2" }, myFlatRow: { minHeight: 66, flexDirection: "row", alignItems: "center", paddingBottom: 12, borderBottomColor: "#e8ecea", borderBottomWidth: StyleSheet.hairlineWidth }, myFlatRowTitle: { color: "#2d3532", fontSize: 16, fontWeight: "600", lineHeight: 24 }, myFlatRowDescription: { color: "#7d8582", fontSize: 14, fontWeight: "400", lineHeight: 21, marginTop: 2 }, myFamilyAvatars: { flexDirection: "row", alignItems: "center", paddingLeft: 8 }, myFamilyAvatar: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderColor: colors.surface, borderWidth: 2, borderRadius: 16, backgroundColor: colors.greenTint }, myFamilyAvatarText: { color: colors.greenDeep, fontSize: 12, fontWeight: "700", lineHeight: 18 }, mySupportRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomColor: "#e8ecea", borderBottomWidth: StyleSheet.hairlineWidth }, mySupportRowText: { color: "#4c5552", fontSize: 16, fontWeight: "400", lineHeight: 24 }, myDangerRowText: { color: "#b45309", fontSize: 16, fontWeight: "400", lineHeight: 24 }, myVersion: { color: "#9aa19f", fontSize: 12, fontWeight: "400", lineHeight: 18, textAlign: "right", marginTop: 16 },
  profile: { ...shadow, minHeight: 100, flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginTop: 20, marginBottom: 24, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }, profileName: { color: colors.foreground, fontSize: font.cardTitle, fontWeight: "600", lineHeight: 27, marginBottom: 2 }, profileEmail: { color: colors.tertiary, fontSize: font.micro, lineHeight: 17, marginTop: 2 }, accountNotice: { padding: 12, marginBottom: 12, backgroundColor: colors.greenSubtle, borderColor: colors.greenTint, borderWidth: 1, borderRadius: radius.md }, accountNoticeError: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" }, accountNoticeErrorText: { color: "#b91c1c" }, accountDeleteWarning: { padding: 12, backgroundColor: "#fff8f8", borderColor: "#fecdd3", borderWidth: 1, borderRadius: radius.md }, accountDeleteWarningTitle: { color: "#b91c1c", fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, accountDeleteWarningText: { color: "#b91c1c", fontSize: font.caption, lineHeight: 20, marginTop: 4 }, photoPickerRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }, formError: { color: "#b91c1c", fontSize: font.caption, lineHeight: 20, marginBottom: 8 }, setting: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }, settingLabel: { flex: 1, color: colors.foreground, fontSize: font.body, fontWeight: "500", lineHeight: 26 }, childRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 8, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface }, childRowSelected: { borderColor: colors.green, backgroundColor: colors.greenTint }, avatarSmall: { width: 44, height: 44, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 22, backgroundColor: colors.greenTint }, codeRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16, marginBottom: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md }, codeValue: { flex: 1, color: colors.foreground, fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, codeButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginRight: 4, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, backgroundColor: colors.surface }, signOutButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 16, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md }, signOutText: { color: colors.secondary, fontSize: font.body, fontWeight: "600", lineHeight: 26 }, withdrawButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4 }, withdrawButtonText: { color: "#b91c1c", fontSize: font.caption, fontWeight: "600", lineHeight: 20 }, destructiveActionButton: { minHeight: 52, flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ef4444", borderRadius: radius.md }, destructiveActionText: { color: colors.surface, fontSize: font.body, fontWeight: "600", lineHeight: 26 }, version: { color: colors.tertiary, fontSize: font.micro, lineHeight: 17, textAlign: "center", marginTop: 32 },
  tabBar: { minHeight: 60, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.96)", borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }, tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 }, tabLabel: { color: colors.tertiary, fontSize: 10, fontWeight: "500", lineHeight: 14 }, tabLabelActive: { color: colors.green, fontWeight: "600" },
});
