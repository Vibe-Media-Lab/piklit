import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor as useEditorContext } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import BottomSheet from '../common/BottomSheet';
import { Wand2, Minimize2, Zap, PenLine, MoreHorizontal } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { LongSentenceExtension } from '../../extensions/LongSentenceExtension';
import { SEO_TEMPLATES } from '../../data/templates';
import { AIService } from '../../services/openai';
import { humanizeText } from '../../utils/humanness';
import '../../styles/tiptap.css';

// 톤별 CTA 템플릿
const CTA_TEMPLATES = {
    bottom: {
        friendly: '<hr><p style="text-align: center; padding: 20px 16px; background: #FFF8F0; border-radius: 12px; margin: 24px 0; font-size: 1.05rem; line-height: 1.8; color: #333;">이 글이 도움이 되셨다면 <b>공감♥</b> 한 번 눌러주세요! 😊<br>궁금한 점이나 여러분의 경험은 <b>댓글</b>로 편하게 남겨주세요~<br>✅ <b>이웃추가</b>하시면 유용한 정보를 먼저 받아보실 수 있어요!</p>',
        professional: '<hr><p style="text-align: center; padding: 20px 16px; background: #F0F4FF; border-radius: 12px; margin: 24px 0; font-size: 1rem; line-height: 1.8; color: #333;">본 글이 유익하셨다면 <b>공감</b>과 <b>이웃추가</b>를 부탁드립니다.<br>추가 문의 사항은 댓글로 남겨주시면 성실히 답변드리겠습니다.</p>',
        honest: '<hr><p style="text-align: center; padding: 20px 16px; background: #F5F5F5; border-radius: 12px; margin: 24px 0; font-size: 1.05rem; line-height: 1.8; color: #333;">솔직 리뷰가 도움이 됐다면 <b>공감 꾹!</b> 👍<br>여러분의 경험도 댓글로 공유해주세요.<br>더 솔직한 리뷰가 궁금하다면 <b>이웃추가</b> 해두세요!</p>',
        emotional: '<hr><p style="text-align: center; padding: 20px 16px; background: #FDF6FF; border-radius: 12px; margin: 24px 0; font-size: 1rem; line-height: 1.9; color: #555;">오늘의 이야기가 마음에 남으셨다면,<br>따뜻한 <b>공감</b> 하나 남겨주세요.<br>여러분의 이야기도 듣고 싶습니다. 💜</p>',
        guide: '<hr><p style="text-align: center; padding: 20px 16px; background: #F0FFF4; border-radius: 12px; margin: 24px 0; font-size: 1.05rem; line-height: 1.8; color: #333;">이 가이드가 도움이 되셨나요? 📌<br><b>공감</b>과 <b>이웃추가</b>로 더 유용한 정보를 받아보세요!<br>질문은 댓글로 편하게 남겨주세요. 자세히 답변드릴게요!</p>'
    },
    question: {
        friendly: '<p style="text-align: center; padding: 14px 16px; background: #FFF8F0; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">여러분은 어떠셨나요? 댓글로 의견을 들려주세요! 😊</p>',
        professional: '<p style="text-align: center; padding: 14px 16px; background: #F0F4FF; border-radius: 10px; margin: 20px 0; font-size: 0.95rem; color: #333;">여러분의 의견은 어떠신가요? 댓글로 경험을 공유해주시면 감사하겠습니다.</p>',
        honest: '<p style="text-align: center; padding: 14px 16px; background: #F5F5F5; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">여러분은 어떻게 생각하세요? 댓글로 솔직한 의견 남겨주세요!</p>',
        emotional: '<p style="text-align: center; padding: 14px 16px; background: #FDF6FF; border-radius: 10px; margin: 20px 0; font-size: 0.95rem; color: #555;">여러분은 어떤 순간이 떠오르시나요? 댓글로 나눠주세요.</p>',
        guide: '<p style="text-align: center; padding: 14px 16px; background: #F0FFF4; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">혹시 다른 좋은 방법을 아시나요? 댓글로 팁을 공유해주세요! 💡</p>'
    },
    save: {
        friendly: '<p style="text-align: center; padding: 14px 16px; background: #FFFDE7; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">📌 나중에 다시 보려면 <b>저장</b>해두세요! 필요한 분께 <b>공유</b>도 부탁드려요~ 🙏</p>',
        professional: '<p style="text-align: center; padding: 14px 16px; background: #FFFDE7; border-radius: 10px; margin: 20px 0; font-size: 0.95rem; color: #333;">📌 참고가 필요하실 때를 위해 <b>저장</b>해두시기 바랍니다. 주변에 <b>공유</b>해주시면 감사하겠습니다.</p>',
        honest: '<p style="text-align: center; padding: 14px 16px; background: #FFFDE7; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">📌 이 정보 필요한 사람 있으면 <b>공유</b>해주세요! 나중에 또 볼 거면 <b>저장</b> 필수!</p>',
        emotional: '<p style="text-align: center; padding: 14px 16px; background: #FFFDE7; border-radius: 10px; margin: 20px 0; font-size: 0.95rem; color: #555;">📌 이 글을 간직하고 싶다면 <b>저장</b>해두세요. 소중한 분께 <b>공유</b>도 좋겠죠.</p>',
        guide: '<p style="text-align: center; padding: 14px 16px; background: #FFFDE7; border-radius: 10px; margin: 20px 0; font-size: 1rem; color: #333;">📌 이 가이드를 <b>저장</b>해두면 필요할 때 바로 확인할 수 있어요! <b>공유</b>도 환영합니다!</p>'
    }
};

const MenuBar = ({ editor, tone, aiFooterEnabled, onToggleAiFooter }) => {
    const [ctaOpen, setCtaOpen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);

    if (!editor) {
        return null;
    }

    const addImage = () => {
        const url = window.prompt('URL');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const insertCta = (type) => {
        const template = CTA_TEMPLATES[type]?.[tone] || CTA_TEMPLATES[type]?.['friendly'];
        if (template) {
            editor.chain().focus().insertContent(template).run();
        }
        setCtaOpen(false);
    };

    const applyTemplate = (key) => {
        editor.commands.setContent(SEO_TEMPLATES[key].content);
        setTemplateOpen(false);
    };

    const btnClass = (active) => `toolbar-btn ${active ? 'is-active' : ''}`;

    return (
        <div className="editor-toolbar">
            <div className="toolbar-group toolbar-template-group">
                <button
                    className="toolbar-btn"
                    onClick={() => { setTemplateOpen(prev => !prev); setCtaOpen(false); }}
                    title="글 템플릿 선택"
                >
                    📝 <span className="toolbar-btn-label">템플릿</span> ▾
                </button>
                {templateOpen && (
                    <div className="template-dropdown">
                        <button onClick={() => applyTemplate('A')}>
                            <span className="template-dropdown-icon">📝</span>
                            <span>
                                <strong>리뷰/방문형</strong>
                                <small>맛집·카페·여행 방문 후기</small>
                            </span>
                        </button>
                        <button onClick={() => applyTemplate('B')}>
                            <span className="template-dropdown-icon">ℹ️</span>
                            <span>
                                <strong>정보/전문형</strong>
                                <small>전문 정보·비교·분석</small>
                            </span>
                        </button>
                        <button onClick={() => applyTemplate('C')}>
                            <span className="template-dropdown-icon">🍳</span>
                            <span>
                                <strong>가이드/레시피형</strong>
                                <small>단계별 가이드·레시피</small>
                            </span>
                        </button>
                        <button onClick={() => applyTemplate('D')}>
                            <span className="template-dropdown-icon">🆚</span>
                            <span>
                                <strong>비교/후기형</strong>
                                <small>제품 비교·사용 후기</small>
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <div className="toolbar-group">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}>B</button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}>I</button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))}>S</button>
                <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))}>🖊️</button>
            </div>
            <div className="toolbar-group">
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))}>H2</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))}>H3</button>
            </div>
            <div className="toolbar-group">
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="글머리 기호">•</button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="번호 매기기">1.</button>
            </div>
            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={addImage} title="이미지 삽입">🖼</button>
            </div>
            <div className="toolbar-group cta-toolbar-group">
                <button
                    className="toolbar-btn cta-toolbar-btn"
                    onClick={() => { setCtaOpen(prev => !prev); setTemplateOpen(false); }}
                    title="CTA(독자 참여 유도) 블록 삽입"
                >
                    📣 <span className="toolbar-btn-label">CTA</span> ▾
                </button>
                {ctaOpen && (
                    <div className="cta-dropdown">
                        <button onClick={() => insertCta('bottom')}>
                            <span className="cta-dropdown-icon">💬</span>
                            <span>
                                <strong>하단 마무리 CTA</strong>
                                <small>공감·댓글·이웃추가 유도</small>
                            </span>
                        </button>
                        <button onClick={() => insertCta('question')}>
                            <span className="cta-dropdown-icon">❓</span>
                            <span>
                                <strong>질문형 CTA</strong>
                                <small>독자 참여 유도 질문</small>
                            </span>
                        </button>
                        <button onClick={() => insertCta('save')}>
                            <span className="cta-dropdown-icon">📌</span>
                            <span>
                                <strong>저장·공유 CTA</strong>
                                <small>저장 및 공유 유도</small>
                            </span>
                        </button>
                    </div>
                )}
            </div>
            <div className="toolbar-group ai-footer-group">
                <label
                    className="ai-footer-toggle"
                    title="체크 시 본문 하단에 AI 이미지 사용 고지 문구를 추가합니다"
                >
                    <input
                        type="checkbox"
                        checked={aiFooterEnabled}
                        onChange={onToggleAiFooter}
                    />
                    <span className="ai-footer-label">AI 고지</span>
                </label>
            </div>
        </div>
    );
};

const AI_FOOTER_HTML = '<p></p><p style="text-align: center; padding: 14px 16px; background: #f5f5f5; border-radius: 8px; font-size: 0.8rem; color: #999; line-height: 1.6;">이 콘텐츠에 포함된 이미지는 AI 생성 도구를 사용하여 제작되었습니다.</p>';
const AI_FOOTER_MARKER = 'AI 생성 도구를 사용하여 제작되었습니다';

const TiptapEditor = () => {
    const { content, setContent, keywords, suggestedTone, editorRef, lastCursorPosRef } = useEditorContext();
    const { showToast } = useToast();
    const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [mobileAiSheet, setMobileAiSheet] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showParagraphBtn, setShowParagraphBtn] = useState(false);
    const paragraphBtnRef = useRef(null);
    const [aiFooterEnabled, setAiFooterEnabled] = useState(() => {
        return content?.includes(AI_FOOTER_MARKER) ?? false;
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: true, allowBase64: true }),
            Highlight,
            LongSentenceExtension
        ],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-content-area',
            },
        },
    });

    // editor 인스턴스를 context에 공유 (커서 위치 삽입용)
    useEffect(() => {
        if (editorRef) editorRef.current = editor;
        return () => { if (editorRef) editorRef.current = null; };
    }, [editor, editorRef]);

    // blur 시 커서 위치 저장 (외부 패널 클릭 시에도 위치 유지)
    useEffect(() => {
        if (!editor || !lastCursorPosRef) return;
        const onBlur = () => {
            const pos = editor.state.selection.anchor;
            lastCursorPosRef.current = pos;
        };
        // 선택이 바뀔 때마다도 저장 (blur 전 마지막 위치 보장)
        const onSelectionUpdate = () => {
            const pos = editor.state.selection.anchor;
            lastCursorPosRef.current = pos;
        };
        editor.on('blur', onBlur);
        editor.on('selectionUpdate', onSelectionUpdate);
        return () => {
            editor.off('blur', onBlur);
            editor.off('selectionUpdate', onSelectionUpdate);
        };
    }, [editor, lastCursorPosRef]);

    // 선택 변경 시 드롭다운 자동 닫힘
    useEffect(() => {
        if (!editor) return;
        const handler = () => setAiDropdownOpen(false);
        editor.on('selectionUpdate', handler);
        return () => { editor.off('selectionUpdate', handler); };
    }, [editor]);

    const handleAiRewrite = useCallback(async (mode) => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        if (!selectedText || !selectedText.trim()) return;

        // 앞뒤 ~200자 추출 → 주변 문맥
        const docText = editor.state.doc.textContent;
        const beforeStart = Math.max(0, from - 200);
        const afterEnd = Math.min(docText.length, to + 200);
        const surroundingContext = docText.slice(beforeStart, afterEnd);

        setAiDropdownOpen(false);
        setAiLoading(true);

        try {
            const result = await AIService.rewriteSelection(
                selectedText,
                surroundingContext,
                keywords?.main || '',
                mode,
                suggestedTone || 'friendly'
            );

            const rawText = result?.text || '';
            if (rawText) {
                // AI 패턴 후처리 적용 (텍스트를 임시 <p>로 감싸서 처리 후 추출)
                const processed = humanizeText(`<p>${rawText}</p>`, suggestedTone || 'friendly')
                    .replace(/^<p>/, '').replace(/<\/p>$/, '');
                editor.chain().focus().insertContentAt({ from, to }, processed).run();
            }
        } catch (error) {
            console.error('[AI 재작성] 실패:', error);
            showToast('AI 재작성에 실패했습니다: ' + error.message, 'error');
        } finally {
            setAiLoading(false);
        }
    }, [editor, keywords, suggestedTone, showToast]);

    // 모바일 감지
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // 모바일: 커서 위치에 따라 문단 버튼 표시
    useEffect(() => {
        if (!editor || !isMobile) return;
        const handleUpdate = () => {
            const { $anchor } = editor.state.selection;
            // 현재 블록 노드의 DOM 위치 찾기
            const resolvedPos = $anchor;
            const depth = resolvedPos.depth;
            if (depth < 1) { setShowParagraphBtn(false); return; }

            const nodeStart = resolvedPos.start(depth);
            const dom = editor.view.nodeDOM(nodeStart - 1);
            if (dom && paragraphBtnRef.current) {
                const rect = dom.getBoundingClientRect();
                const wrapperRect = paragraphBtnRef.current.parentElement?.getBoundingClientRect();
                if (wrapperRect) {
                    paragraphBtnRef.current.style.top = `${rect.top - wrapperRect.top + rect.height / 2 - 16}px`;
                }
                setShowParagraphBtn(true);
            }
        };
        editor.on('selectionUpdate', handleUpdate);
        editor.on('focus', handleUpdate);
        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('focus', handleUpdate);
        };
    }, [editor, isMobile]);

    // 모바일: 문단 전체 선택 후 AI 재작성
    const handleMobileAiRewrite = useCallback(async (mode) => {
        if (!editor) return;
        setMobileAiSheet(false);

        // 현재 커서 위치의 블록 노드 전체 선택
        const { $anchor } = editor.state.selection;
        const depth = $anchor.depth;
        if (depth < 1) return;
        const from = $anchor.start(depth);
        const to = $anchor.end(depth);

        // 텍스트 선택 적용
        editor.chain().focus().setTextSelection({ from, to }).run();

        // 기존 handleAiRewrite 로직 재사용
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText?.trim()) return;

        const docText = editor.state.doc.textContent;
        const beforeStart = Math.max(0, from - 200);
        const afterEnd = Math.min(docText.length, to + 200);
        const surroundingContext = docText.slice(beforeStart, afterEnd);

        setAiLoading(true);
        try {
            const result = await AIService.rewriteSelection(
                selectedText, surroundingContext,
                keywords?.main || '', mode,
                suggestedTone || 'friendly'
            );
            const rawText = result?.text || '';
            if (rawText) {
                const processed = humanizeText(`<p>${rawText}</p>`, suggestedTone || 'friendly')
                    .replace(/^<p>/, '').replace(/<\/p>$/, '');
                editor.chain().focus().insertContentAt({ from, to }, processed).run();
            }
        } catch (error) {
            showToast('AI 재작성에 실패했습니다: ' + error.message, 'error');
        } finally {
            setAiLoading(false);
        }
    }, [editor, keywords, suggestedTone, showToast]);

    // Content Sync Logic: 외부(스트리밍 등)에서 content가 변경되면 에디터에 반영
    // emitUpdate=false로 onUpdate 콜백 미발생 → 무한 루프 방지
    useEffect(() => {
        if (!editor || !content) return;
        if (content !== editor.getHTML()) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    // AI 푸터 토글
    const toggleAiFooter = useCallback(() => {
        if (!editor) return;
        const next = !aiFooterEnabled;
        setAiFooterEnabled(next);

        const html = editor.getHTML();
        if (next) {
            // 이미 있으면 추가하지 않음
            if (!html.includes(AI_FOOTER_MARKER)) {
                // 끝에 빈 문단 정리 후 삽입
                const trimmed = html.replace(/(<p><\/p>)+$/, '');
                editor.commands.setContent(trimmed);
                editor.chain().focus('end').insertContent(AI_FOOTER_HTML).run();
            }
        } else {
            // 푸터가 포함된 <p> 태그만 정확히 제거 (마커 텍스트가 있는 <p>만 대상)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allP = doc.body.querySelectorAll('p');
            let removed = false;
            allP.forEach(p => {
                if (p.textContent.includes(AI_FOOTER_MARKER)) {
                    p.remove();
                    removed = true;
                }
            });
            if (removed) {
                editor.commands.setContent(doc.body.innerHTML);
            }
        }
    }, [editor, aiFooterEnabled]);

    return (
        <div className="tiptap-editor-wrapper">
            <MenuBar editor={editor} tone={suggestedTone || 'friendly'} aiFooterEnabled={aiFooterEnabled} onToggleAiFooter={toggleAiFooter} />

            {editor && (
                <BubbleMenu editor={editor}>
                    <div className="bubble-menu">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>B</button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>I</button>
                        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''}>S</button>

                        <span className="bubble-menu-separator" />

                        <div className="bubble-menu-ai-wrapper">
                            {aiLoading ? (
                                <span className="ai-spinner" />
                            ) : (
                                <button
                                    className="bubble-menu-ai-btn"
                                    onClick={() => setAiDropdownOpen(prev => !prev)}
                                >
                                    AI ▾
                                </button>
                            )}

                            {aiDropdownOpen && !aiLoading && (
                                <div className="ai-rewrite-dropdown">
                                    <button onClick={() => handleAiRewrite('expand')}>더 자세하게</button>
                                    <button onClick={() => handleAiRewrite('condense')}>더 간결하게</button>
                                    <button onClick={() => handleAiRewrite('factboost')}>팩트 보강</button>
                                    <button onClick={() => handleAiRewrite('polish')}>문장 다듬기</button>
                                </div>
                            )}
                        </div>
                    </div>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} />

            {/* 모바일: 문단 AI 버튼 (포커스 시 페이드인) */}
            {isMobile && (
                <button
                    ref={paragraphBtnRef}
                    className={`mobile-paragraph-ai-btn${showParagraphBtn ? ' visible' : ''}`}
                    onClick={() => setMobileAiSheet(true)}
                    aria-label="AI로 문단 개선"
                >
                    <MoreHorizontal size={18} />
                </button>
            )}

            {/* 모바일: AI 재작성 바텀시트 */}
            <BottomSheet
                isOpen={mobileAiSheet}
                onClose={() => setMobileAiSheet(false)}
                snapPoints={[0.4, 0.75]}
                title="이 문단을 AI로 개선"
            >
                <div className="mobile-ai-rewrite-list">
                    <button onClick={() => handleMobileAiRewrite('expand')} disabled={aiLoading}>
                        <Wand2 size={20} />
                        <div>
                            <strong>더 자세하게</strong>
                            <span>선택한 문단을 확장합니다</span>
                        </div>
                    </button>
                    <button onClick={() => handleMobileAiRewrite('condense')} disabled={aiLoading}>
                        <Minimize2 size={20} />
                        <div>
                            <strong>더 간결하게</strong>
                            <span>핵심만 남기고 축약합니다</span>
                        </div>
                    </button>
                    <button onClick={() => handleMobileAiRewrite('factboost')} disabled={aiLoading}>
                        <Zap size={20} />
                        <div>
                            <strong>팩트 보강</strong>
                            <span>구체적 수치를 추가합니다</span>
                        </div>
                    </button>
                    <button onClick={() => handleMobileAiRewrite('polish')} disabled={aiLoading}>
                        <PenLine size={20} />
                        <div>
                            <strong>문장 다듬기</strong>
                            <span>자연스럽게 다듬습니다</span>
                        </div>
                    </button>
                </div>
                {aiLoading && (
                    <div className="mobile-ai-rewrite-loading">
                        AI가 문단을 개선하고 있습니다...
                    </div>
                )}
            </BottomSheet>
        </div>
    );
};

export default TiptapEditor;
