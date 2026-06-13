"use client";

import dynamic from "next/dynamic";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { AiEmptyState } from "./recipe/ai-empty-state";
import { AiSheet } from "./recipe/ai-sheet";
import { RecipeFloatingActions } from "./recipe/recipe-floating-actions";
import { RecipeList } from "./recipe/recipe-list";
import { RecipeTabs } from "./recipe/recipe-tabs";
import { useRecipePage } from "./recipe/use-recipe-page";

const RecipeFormSheet = dynamic(
  () => import("./recipe/recipe-form-sheet").then((mod) => mod.RecipeFormSheet),
  { ssr: false }
);

const RecipeDetailOverlay = dynamic(
  () => import("./recipe/recipe-detail-overlay").then((mod) => mod.RecipeDetailOverlay),
  { ssr: false }
);

export function RecipePage() {
  const vm = useRecipePage();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white pb-[116px]">
      <div className="sticky top-0 z-30 bg-white">
        <div className="px-4 pb-3 pt-12">
          <div className="mb-6 flex items-center">
            <h1 className="text-[24px] font-bold leading-[1.28] text-[#1f2423]">
              레시피 북
            </h1>
          </div>

          <AppSearchInput
            value={vm.searchQuery}
            onChange={vm.setSearchQuery}
            placeholder="레시피 검색"
            inputClassName="border-[#e7e9e8] bg-[#e9ebea]"
            iconClassName="left-5 h-[22px] w-[22px] text-[#97a09d]"
          />
        </div>

        <RecipeTabs activeTab={vm.activeTab} onChange={vm.setActiveTab} />
      </div>

      <div className="flex-1 px-4 pb-4 pt-4">
        {vm.shouldShowAiEmpty ? (
          <AiEmptyState onRecommend={vm.openAiRecommendSheet} />
        ) : (
          <RecipeList
            isLoading={vm.isLoadingSavedRecipes}
            recipes={vm.filteredRecipes}
            openActionMenuId={vm.openActionMenuId}
            onOpenDetail={vm.setDetailRecipeId}
            onToggleFavorite={(id) => {
              void vm.toggleFavorite(id);
            }}
            onToggleActionMenu={(id) =>
              vm.setOpenActionMenuId((prev) => (prev === id ? null : id))
            }
            onOpenEdit={vm.openEditRecipeModal}
            onDelete={(id) => {
              void vm.deleteRecipe(id);
            }}
          />
        )}
      </div>

      {!vm.isOverlayOpen && !vm.shouldShowAiEmpty ? (
        <RecipeFloatingActions
          onAiClick={() => {
            vm.setActiveTab("ai");
            vm.openAiRecommendSheet();
          }}
          onAddClick={() => vm.setOpenAddForm(true)}
          showAddButton={vm.activeTab !== "ai"}
        />
      ) : null}

      <AiSheet
        open={vm.openAiSheet}
        view={vm.aiSheetView}
        isGeneratingAi={vm.isGeneratingAi}
        aiGenerationStage={vm.aiGenerationStage}
        isLoadingFridge={vm.isLoadingFridge}
        ingredientKeyword={vm.ingredientKeyword}
        ingredientSections={vm.ingredientSections}
        selectedIngredientIds={vm.selectedIngredientIds}
        selectedIngredientCount={vm.selectedIngredientIds.size}
        isAllDisplayedSelected={vm.isAllDisplayedSelected}
        generatedRecipes={vm.generatedRecipes}
        savedGeneratedIds={vm.savedGeneratedIds}
        savingGeneratedIds={vm.savingGeneratedIds}
        onClose={vm.closeAiRecommendSheet}
        onKeywordChange={vm.setIngredientKeyword}
        onToggleSelectAllDisplayed={vm.toggleSelectAllDisplayed}
        onToggleSection={vm.toggleSection}
        onToggleOneIngredient={vm.toggleOneIngredient}
        onBackToSelect={() => vm.setAiSheetView("select")}
        onRequestRecommend={() => {
          void vm.requestAiRecipeFromSelection();
        }}
        onSaveGeneratedRecipe={(item) => {
          void vm.saveGeneratedRecipe(item);
        }}
      />

      <RecipeDetailOverlay
        recipe={vm.detailRecipe}
        onClose={() => vm.setDetailRecipeId(null)}
        onToggleFavorite={(id) => {
          void vm.toggleFavorite(id);
        }}
      />

      <RecipeFormSheet
        open={vm.openAddForm}
        title="새 레시피 추가"
        closeAriaLabel="레시피 추가 닫기"
        name={vm.newTitle}
        description={vm.newSubtitle}
        link={vm.newLink}
        memo={vm.newMemo}
        taste={vm.newTaste}
        submitLabel={vm.isSubmittingCustomRecipe ? "저장 중..." : "레시피 저장하기"}
        submitDisabled={!vm.newTitle.trim() || vm.isSubmittingCustomRecipe}
        onClose={() => vm.setOpenAddForm(false)}
        onNameChange={vm.setNewTitle}
        onDescriptionChange={vm.setNewSubtitle}
        onLinkChange={vm.setNewLink}
        onMemoChange={vm.setNewMemo}
        onTasteChange={vm.setNewTaste}
        onSubmit={() => {
          void vm.submitCustomRecipe();
        }}
      />

      <RecipeFormSheet
        open={Boolean(vm.editingRecipeId)}
        title="레시피 수정"
        closeAriaLabel="레시피 수정 닫기"
        name={vm.editName}
        description={vm.editDescription}
        link={vm.editLink}
        memo={vm.editMemo}
        taste={vm.editTaste}
        submitLabel={vm.isSavingEditedRecipe ? "수정 중..." : "수정 완료"}
        submitDisabled={!vm.editName.trim() || vm.isSavingEditedRecipe}
        onClose={() => vm.setEditingRecipeId(null)}
        onNameChange={vm.setEditName}
        onDescriptionChange={vm.setEditDescription}
        onLinkChange={vm.setEditLink}
        onMemoChange={vm.setEditMemo}
        onTasteChange={vm.setEditTaste}
        onSubmit={() => {
          void vm.saveEditedRecipe();
        }}
      />
    </div>
  );
}
