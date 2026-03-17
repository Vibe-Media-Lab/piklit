import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor as useEditorContext } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import BottomSheet from '../common/BottomSheet';
import { Wand2, Minimize2, Zap, PenLine, MoreHorizontal, Check, X, RefreshCw, Undo2 } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { LongSentenceExtension } from '../../extensions/LongSentenceExtension';
import { SEO_TEMPLATES } from '../../data/templates';
import { AIService } from '../../services/openai';
import { humanizeText } from '../../utils/humanness';
import { analyzePost } from '../../utils/analysis';
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

const AI_FOOTER_HTML = '<p style="text-align: center; padding: 14px 16px; margin-top: 24px; background: #f5f5f5; border-radius: 8px; font-size: 0.8rem; color: #999; line-height: 1.6;">이 콘텐츠에 포함된 이미지는 AI 생성 도구를 사용하여 제작되었습니다.</p>';
const AI_FOOTER_MARKER = 'AI 생성 도구를 사용하여 제작되었습니다';

const TiptapEditor = () => {
    const { content, setContent, keywords, suggestedTone, editorRef, lastCursorPosRef, humanTip, setHumanTip, recordAiAction, title, analysis, targetLength, posts, currentPostId } = useEditorContext();
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

    // AI 푸터 토글 — setContent 미사용 (모바일 "..." 방지)
    const toggleAiFooter = useCallback(() => {
        if (!editor) return;
        const next = !aiFooterEnabled;
        setAiFooterEnabled(next);

        if (next) {
            // 이미 있으면 추가하지 않음
            if (!editor.getHTML().includes(AI_FOOTER_MARKER)) {
                editor.chain().focus('end').insertContent(AI_FOOTER_HTML).run();
            }
        } else {
            // DOM에서 직접 마커 포함 노드 제거 (setContent 없이)
            const { doc, tr } = editor.state;
            let transaction = tr;
            doc.descendants((node, pos) => {
                if (node.isText && node.text?.includes(AI_FOOTER_MARKER)) {
                    // 부모 노드(paragraph) 전체 삭제
                    const resolved = doc.resolve(pos);
                    const parent = resolved.parent;
                    const parentPos = resolved.before(resolved.depth);
                    transaction = transaction.delete(parentPos, parentPos + parent.nodeSize);
                    return false;
                }
            });
            if (transaction.docChanged) {
                editor.view.dispatch(transaction);
            }
        }
    }, [editor, aiFooterEnabled]);

    // AI 전체 재작성 + 점수 비교
    const [rewriteLoading, setRewriteLoading] = useState(false);
    const [rewriteScores, setRewriteScores] = useState(null);
    const [previousContent, setPreviousContent] = useState(null);

    const calcSeoPercentage = (a) => {
        const s = Object.values(a.checks).filter(Boolean).length;
        const m = Object.keys(a.checks).length || 1;
        return Math.round((s / m) * 100);
    };

    const handleFullRewrite = useCallback(async () => {
        if (!editor || !content || content === '<p></p>') {
            showToast('본문을 먼저 작성해주세요.', 'warning');
            return;
        }
        if (!window.confirm('본문 전체를 AI가 다시 작성합니다.\n기존 내용이 교체됩니다. 계속하시겠습니까?')) return;

        const beforeScore = calcSeoPercentage(analysis);
        setPreviousContent(content);
        setRewriteScores(null);
        setRewriteLoading(true);
        recordAiAction('fullRewrite');
        try {
            const result = await AIService.rewriteFullContent(
                content,
                keywords?.main || '',
                suggestedTone || 'friendly'
            );
            if (result?.html) {
                editor.commands.setContent(result.html);
                const currentPost = posts.find(p => p.id === currentPostId);
                const categoryId = currentPost?.categoryId || 'daily';
                const newAnalysis = analyzePost(title, result.html, keywords, targetLength, categoryId);
                const afterScore = calcSeoPercentage(newAnalysis);
                setRewriteScores({ before: beforeScore, after: afterScore });
            }
        } catch (e) {
            showToast('재작성 오류: ' + e.message, 'error');
            setPreviousContent(null);
        } finally {
            setRewriteLoading(false);
        }
    }, [editor, content, keywords, suggestedTone, showToast, recordAiAction, analysis, title, targetLength, posts, currentPostId]);

    const handleRewriteUndo = useCallback(() => {
        if (!editor || !previousContent) return;
        editor.commands.setContent(previousContent);
        setPreviousContent(null);
        setRewriteScores(null);
        showToast('원본이 복원되었습니다.', 'success');
    }, [editor, previousContent, showToast]);

    const handleRewriteClose = useCallback(() => {
        if (previousContent && !window.confirm('카드를 닫으면 원본 복원이 불가합니다.\n닫으시겠습니까?')) return;
        setPreviousContent(null);
        setRewriteScores(null);
    }, [previousContent]);

    // 휴먼라이징 TIP 적용
    const handleApplyTip = useCallback(() => {
        if (!editor || !humanTip) return;

        const { original, revised } = humanTip;
        if (!original || !revised) return;

        const docText = editor.state.doc.textContent;
        const searchText = original.trim();
        let pos = docText.indexOf(searchText);

        if (pos === -1) {
            const normalize = s => s.replace(/\s+/g, ' ').trim();
            pos = normalize(docText).indexOf(normalize(searchText));
        }
        if (pos === -1) {
            const partial = searchText.slice(0, 20).trim();
            if (partial.length >= 8) pos = docText.indexOf(partial);
        }

        if (pos === -1) {
            showToast('원문을 본문에서 찾을 수 없습니다.', 'warning');
            return;
        }

        const replaceLength = docText.indexOf(searchText) !== -1
            ? searchText.length
            : Math.min(searchText.length, docText.length - pos);

        const posMap = [];
        let textOffset = 0;
        editor.state.doc.descendants((node, nodePos) => {
            if (node.isText) {
                for (let i = 0; i < node.text.length; i++) {
                    posMap.push({ textOffset: textOffset + i, pmPos: nodePos + i });
                }
                textOffset += node.text.length;
            }
        });
        if (posMap.length > 0) {
            const last = posMap[posMap.length - 1];
            posMap.push({ textOffset: last.textOffset + 1, pmPos: last.pmPos + 1 });
        }

        const fromEntry = posMap.find(e => e.textOffset === pos);
        const toEntry = posMap.find(e => e.textOffset === pos + replaceLength);

        if (fromEntry && toEntry) {
            editor.chain().insertContentAt({ from: fromEntry.pmPos, to: toEntry.pmPos }, revised).run();
            recordAiAction('humanTipApply');
            showToast('수정안이 적용되었습니다.', 'success');
        } else {
            showToast('원문 위치를 특정할 수 없습니다.', 'warning');
        }

        // 하이라이트 제거 + TIP 닫기
        document.querySelectorAll('.humanness-inline-highlight').forEach(el => {
            el.classList.remove('humanness-inline-highlight');
        });
        setHumanTip(null);
    }, [editor, humanTip, showToast, recordAiAction, setHumanTip]);

    // TIP 닫기
    const handleCloseTip = useCallback(() => {
        document.querySelectorAll('.humanness-inline-highlight').forEach(el => {
            el.classList.remove('humanness-inline-highlight');
        });
        setHumanTip(null);
    }, [setHumanTip]);

    // TIP 카드 위치 계산 (스크롤 완료 후)
    const [tipPosition, setTipPosition] = useState(null);
    useEffect(() => {
        if (!humanTip) { setTipPosition(null); return; }

        const calcPosition = () => {
            const highlighted = document.querySelector('.humanness-inline-highlight');
            const wrapper = document.querySelector('.tiptap-editor-wrapper');
            if (highlighted && wrapper) {
                const hRect = highlighted.getBoundingClientRect();
                const wRect = wrapper.getBoundingClientRect();
                setTipPosition({
                    top: hRect.bottom - wRect.top + 8,
                    left: Math.max(0, hRect.left - wRect.left),
                });
            }
        };

        // 형광펜(350ms) + 스크롤 애니메이션(~400ms) 이후 위치 계산
        const timer = setTimeout(calcPosition, 800);

        // 스크롤 시 위치 재계산 (PC에서 TIP 카드 따라가기)
        const editorWrap = document.querySelector('.tiptap-editor-wrapper');
        const onScroll = () => requestAnimationFrame(calcPosition);
        editorWrap?.addEventListener('scroll', onScroll, true);

        return () => {
            clearTimeout(timer);
            editorWrap?.removeEventListener('scroll', onScroll, true);
        };
    }, [humanTip]);

    return (
        <div className="tiptap-editor-wrapper" style={{ position: 'relative' }}>
            <MenuBar editor={editor} tone={suggestedTone || 'friendly'} aiFooterEnabled={aiFooterEnabled} onToggleAiFooter={toggleAiFooter} />

            {/* AI 전체 재작성 버튼 + 점수 비교 카드 */}
            <div className="editor-rewrite-bar">
                <button
                    className="editor-rewrite-btn"
                    onClick={handleFullRewrite}
                    disabled={rewriteLoading}
                    title="본문 전체를 AI가 다시 작성합니다"
                >
                    {rewriteLoading
                        ? <><Wand2 size={13} className="spin" /> 재작성 중...</>
                        : <><RefreshCw size={13} /> AI 전체 재작성</>
                    }
                </button>
            </div>

            {rewriteScores && (
                <div className="rewrite-score-card">
                    <div className="rewrite-score-content">
                        <span className="rewrite-score-label">SEO 점수</span>
                        <span className="rewrite-score-before">{rewriteScores.before}점</span>
                        <span className="rewrite-score-arrow">→</span>
                        <span className="rewrite-score-after">{rewriteScores.after}점</span>
                        <span className={`rewrite-score-diff ${rewriteScores.after >= rewriteScores.before ? 'up' : 'down'}`}>
                            {rewriteScores.after >= rewriteScores.before ? '+' : ''}{rewriteScores.after - rewriteScores.before}점 {rewriteScores.after >= rewriteScores.before ? '↑' : '↓'}
                        </span>
                    </div>
                    <div className="rewrite-score-actions">
                        {previousContent && (
                            <button className="rewrite-undo-btn" onClick={handleRewriteUndo}>
                                <Undo2 size={13} /> 되돌리기
                            </button>
                        )}
                        <button className="rewrite-close-btn" onClick={handleRewriteClose}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

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

            {/* 휴먼라이징 인라인 TIP 카드 */}
            {humanTip && (
                <div
                    className="humanness-tip-card"
                    style={tipPosition ? { top: tipPosition.top, left: tipPosition.left } : {}}
                >
                    <div className="humanness-tip-header">
                        <span className="humanness-tip-label">수정 제안</span>
                        <button className="humanness-tip-close" onClick={handleCloseTip}>
                            <X size={14} />
                        </button>
                    </div>
                    <div className="humanness-tip-original">{humanTip.original}</div>
                    <div className="humanness-tip-arrow">↓</div>
                    <div className="humanness-tip-revised">{humanTip.revised}</div>
                    {humanTip.reason && (
                        <div className="humanness-tip-reason">{humanTip.reason}</div>
                    )}
                    <button className="humanness-tip-apply" onClick={handleApplyTip}>
                        <Check size={14} /> 적용하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default TiptapEditor;
