import React from 'react';
import { FolderOpen, Edit3, ArrowLeft, ArrowRight } from 'lucide-react';
import WizardStepIndicator from './WizardStepIndicator';
import { CATEGORIES, getToneForCategory } from '../../data/categories';
import { useEditor } from '../../context/EditorContext';
import { getTemplateById } from '../../data/templates';

// 카테고리별 placeholder
const CATEGORY_PLACEHOLDERS = {
    food: '예: 제주 김선문 식당',
    cafe: '예: 성수동 카페 온도',
    shopping: '예: 애플 맥미니 M4',
    comparison: '예: 다이슨 에어랩 vs 샤오미 드라이어',
    review: '예: 삼성 갤럭시 S25 울트라',
    travel: '예: 제주도 2박3일 여행',
    pet: '예: 골든리트리버 산책 코스 추천',
    tech: '예: 애플 비전프로 개발자 리뷰',
    recipe: '예: 초간단 원팬 파스타',
    parenting: '예: 12개월 아기 이유식',
    tips: '예: 자취방 곰팡이 제거 꿀팁',
    economy: '예: 2026 청년 주택청약 총정리',
    medical: '예: 역류성 식도염 증상과 생활습관',
    law: '예: 전세 보증금 반환 청구 절차',
    tutorial: '예: 노션 자동화 워크플로우 만들기',
    daily: '예: 직장인 퇴근 후 루틴 공유',
};

const WizardStepTopic = ({
    isNewPost,
    selectedCategory,
    topicInput,
    mainKeyword,
    canProceedToStep1,
    onCategorySelect,
    onTopicChange,
    onMainKeywordChange,
    onNext,
    onSwitchToDirect,
}) => {
    const { updatePostMeta, updateMainKeyword } = useEditor();

    return (
        <div className="wizard-card-wrap">
            <WizardStepIndicator aiStep={1} />

            <h2 className="wizard-step-heading">
                <FolderOpen size={20} /> Step 1: 주제 선택
            </h2>
            <p className="wizard-step-desc">
                카테고리를 선택하고 주제를 입력하세요. 다음 단계에서 키워드를 분석합니다.
            </p>

            {/* 카테고리 그리드 */}
            {isNewPost && (
                <div className="wizard-form-group">
                    <label className="wizard-label">
                        <FolderOpen size={16} /> 카테고리 선택 <span className="wizard-required">*</span>
                    </label>
                    <div className="wizard-category-grid">
                        {CATEGORIES.map(cat => (
                            <div
                                key={cat.id}
                                className={`wizard-category-card ${selectedCategory?.id === cat.id ? 'selected' : ''}`}
                                onClick={() => onCategorySelect(cat)}
                            >
                                <span className="wizard-category-card-icon">{cat.icon}</span>
                                <span className="wizard-category-card-label">
                                    {cat.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 주제 입력 */}
            {isNewPost && (
                <div className="wizard-form-group">
                    <label className="wizard-label">
                        <Edit3 size={16} /> 주제 입력 <span className="wizard-required">*</span>
                    </label>
                    <input
                        type="text"
                        value={topicInput}
                        onChange={e => onTopicChange(e.target.value)}
                        placeholder={CATEGORY_PLACEHOLDERS[selectedCategory?.id] || '예: 작성할 주제를 입력하세요'}
                        className="wizard-field"
                        autoFocus
                    />
                </div>
            )}

            {/* 메인 키워드 (기존 글 재편집 시 표시) */}
            {!isNewPost && (
                <div className="wizard-form-group">
                    <label className="wizard-label">
                        <Edit3 size={16} /> 메인 키워드 <span className="wizard-required">*</span>
                    </label>
                    <input
                        type="text"
                        value={mainKeyword}
                        onChange={e => onMainKeywordChange(e.target.value)}
                        placeholder="예: 제주 김선문 식당"
                        className="wizard-field"
                    />
                </div>
            )}

            <div className="wizard-nav">
                <button
                    onClick={onSwitchToDirect}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 직접 작성으로 전환
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceedToStep1}
                    className="wizard-btn-primary"
                >
                    다음: 키워드 + 설정 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default WizardStepTopic;
