import React, { useState, useRef, useEffect } from 'react';
import { ArticleBlock, EditorTheme, ImageAsset, ImageRatio, ImageResolution, ImageGenAspectRatio, ImageModelType, AppView, GeneratedArticle } from './types';
import { THEMES, INITIAL_CONTENT } from './constants';
import { processTextWithGemini, generateImageFromPrompt, generateArticleWithSearch } from './services/geminiService';
import ArticleRenderer from './components/ArticleRenderer';
import { 
  Wand2, 
  Image as ImageIcon, 
  Copy, 
  RotateCcw, 
  Loader2,
  Check,
  Square,
  RectangleHorizontal,
  Monitor,
  Smartphone,
  Palette,
  Layout,
  Sparkles,
  Settings,
  X,
  Menu,
  ImagePlus,
  Zap,
  Crown,
  PenTool,
  Search,
  ArrowRight,
  FileText,
  Globe,
  ExternalLink,
  History,
  Trash2,
  Clock,
  BookOpen
} from 'lucide-react';

const STORAGE_KEY = 'wechat_editor_history';

const App: React.FC = () => {
  // --- View State ---
  const [activeView, setActiveView] = useState<AppView>('editor');

  // --- Editor State ---
  const [rawText, setRawText] = useState<string>(INITIAL_CONTENT);
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [currentTheme, setCurrentTheme] = useState<EditorTheme>(THEMES[0]);
  const [imageRatio, setImageRatio] = useState<ImageRatio>('original');
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [showCopySuccess, setShowCopySuccess] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Image Gen State
  const [isImgGenModalOpen, setIsImgGenModalOpen] = useState(false);
  const [imgGenPrompt, setImgGenPrompt] = useState('');
  const [imgGenModel, setImgGenModel] = useState<ImageModelType>('flash');
  const [imgGenSize, setImgGenSize] = useState<ImageResolution>('1K');
  const [imgGenRatio, setImgGenRatio] = useState<ImageGenAspectRatio>('4:3');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // --- Writer State ---
  const [writerTopic, setWriterTopic] = useState('');
  const [writerContext, setWriterContext] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [articleHistory, setArticleHistory] = useState<GeneratedArticle[]>([]);

  // --- Refs ---
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Lifecycle ---
  // Load History
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setArticleHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save History
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articleHistory));
  }, [articleHistory]);

  // --- Handlers ---

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
  };

  const handleGenerate = async () => {
    if (!process.env.API_KEY) {
      alert("Please set your API_KEY in the environment or ensure the app is configured correctly.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const generatedBlocks = await processTextWithGemini(rawText);
      setBlocks(generatedBlocks);
      setHasProcessed(true);
    } catch (error) {
      console.error(error);
      alert("AI Processing Failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset everything? This will clear your current changes.")) {
      setRawText(INITIAL_CONTENT);
      setBlocks([]);
      setHasProcessed(false);
      setImages([]);
    }
  };

  const insertImagePlaceholder = () => {
    const nextIndex = images.length + 1;
    const tag = `[IMG-${nextIndex}]`;
    insertTextAtCursor(tag);
    
    // Automatically trigger file upload
    setTimeout(() => {
        fileInputRef.current?.click();
    }, 100);
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = rawText;
        
        // Insert at cursor position
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        setRawText(newText);
        
        // Restore focus
        setTimeout(() => {
           textarea.focus();
           textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 0);
    } else {
        setRawText(prev => prev + '\n' + textToInsert + '\n');
    }
  }

  const openImageGenModal = () => {
    // If text is selected, use it as prompt
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setImgGenPrompt(rawText.substring(start, end));
      }
    }
    setIsImgGenModalOpen(true);
  }

  const handleImageGeneration = async () => {
    if (!imgGenPrompt.trim()) return;
    
    setIsGeneratingImg(true);
    try {
      const base64Image = await generateImageFromPrompt(imgGenPrompt, imgGenSize, imgGenRatio, imgGenModel);
      
      if (base64Image) {
        const newImage: ImageAsset = {
          id: `IMG-${images.length + 1}`,
          previewUrl: base64Image,
        };
        setImages(prev => [...prev, newImage]);
        
        // Insert tag
        const tag = `[${newImage.id}]`;
        insertTextAtCursor(tag);
        
        setIsImgGenModalOpen(false);
        setImgGenPrompt('');
      } else {
        alert("未能生成图片，请重试。");
      }
    } catch (e) {
      console.error(e);
      alert("生成失败，请检查网络或 API Key。");
    } finally {
      setIsGeneratingImg(false);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImage: ImageAsset = {
            id: `IMG-${images.length + 1}`,
            file: file,
            previewUrl: event.target.result as string,
          };
          setImages(prev => [...prev, newImage]);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = async () => {
    if (!previewRef.current) return;

    try {
      const htmlContent = previewRef.current.innerHTML;
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([previewRef.current.innerText], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 
        'text/html': blobHtml,
        'text/plain': blobText
      })];

      await navigator.clipboard.write(data);
      
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert("自动复制失败。请手动全选右侧预览区域内容进行复制 (Ctrl+A, Ctrl+C)。");
    }
  };

  // --- Writer Handlers ---
  const handleWriterGenerate = async () => {
    if (!writerTopic.trim()) {
      alert("请输入文章主题");
      return;
    }

    setIsWriting(true);
    setGeneratedArticle(null);

    try {
      const article = await generateArticleWithSearch(writerTopic, writerContext, useSearch);
      setGeneratedArticle(article);
      // Save to history (adding to top)
      setArticleHistory(prev => {
        const newHistory = [article, ...prev];
        return newHistory.slice(0, 50); // Keep last 50
      });
    } catch (error) {
      console.error(error);
      alert("写作失败，请稍后重试。");
    } finally {
      setIsWriting(false);
    }
  };

  const handleImportToEditor = () => {
    if (!generatedArticle) return;
    
    const newContent = `# ${generatedArticle.title}\n\n${generatedArticle.content}`;
    setRawText(newContent);
    setActiveView('editor');
    // Optionally trigger format immediately, but let's let the user review first
  };

  const loadFromHistory = (article: GeneratedArticle) => {
    setGeneratedArticle(article);
    setWriterTopic(article.title);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('确定删除这条记录吗？')) {
      setArticleHistory(prev => prev.filter(item => item.id !== id));
      if (generatedArticle?.id === id) {
        setGeneratedArticle(null);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] font-sans text-gray-900 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- Sidebar (Navigation & Settings) --- */}
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-100 flex flex-col shadow-2xl lg:shadow-none transition-transform duration-300 lg:translate-x-0 lg:static lg:flex
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800 tracking-tight">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-indigo-200 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>公众号助手</span>
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Navigation Switcher */}
        <div className="p-4 px-6 pb-2">
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveView('writer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'writer' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              AI 写作
            </button>
            <button
              onClick={() => setActiveView('editor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'editor' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              智能排版
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar">
          {activeView === 'editor' ? (
            <>
              {/* Theme Selection */}
              <section className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Palette className="w-3.5 h-3.5" />
                  <span>设计风格 / Theme</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(theme => {
                    const isActive = currentTheme.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setCurrentTheme(theme)}
                        className={`relative group flex flex-col items-start p-3 rounded-xl border transition-all duration-200 text-left ${
                          isActive 
                            ? 'border-indigo-500 bg-indigo-50/30 shadow-sm ring-1 ring-indigo-500/10' 
                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: theme.colors.primary }} />
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: theme.colors.accent }} />
                          </div>
                          {isActive && <div className="bg-indigo-600 rounded-full p-0.5"><Check className="w-2 h-2 text-white" /></div>}
                        </div>
                        <span className={`font-semibold text-xs mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {theme.name}
                        </span>
                        <p className="text-[10px] text-gray-400 line-clamp-1 w-full opacity-80">{theme.description}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Image Settings */}
              <section className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>图片设置 / Image</span>
                </div>
                
                <div className="bg-gray-50/80 p-1.5 rounded-xl grid grid-cols-3 gap-1.5 border border-gray-100">
                  {[
                    { id: 'original', label: '原图', icon: Monitor },
                    { id: '4:3', label: '4:3', icon: RectangleHorizontal },
                    { id: '1:1', label: '1:1', icon: Square },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isActive = imageRatio === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setImageRatio(opt.id as ImageRatio)}
                        className={`flex flex-col items-center justify-center py-3 rounded-lg text-[11px] font-medium transition-all ${
                          isActive
                          ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-indigo-600' : 'text-gray-300'}`} />
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
             // Writer Mode Sidebar Content: History
             <section className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5" />
                    <span>创作历史 / History</span>
                  </div>
                  <span className="text-[10px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">{articleHistory.length}</span>
                </div>
                
                {articleHistory.length === 0 ? (
                  <div className="text-center py-10 px-4 text-gray-300 text-xs border border-dashed border-gray-200 rounded-xl">
                    <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>暂无历史记录</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar pb-10">
                    {articleHistory.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className={`group relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                          generatedArticle?.id === item.id 
                            ? 'bg-white border-indigo-200 shadow-md shadow-indigo-100 ring-1 ring-indigo-500/10' 
                            : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <h4 className={`text-sm font-semibold line-clamp-2 leading-snug ${generatedArticle?.id === item.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                            {item.title || "无标题文章"}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(item.timestamp).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <button 
                            onClick={(e) => deleteFromHistory(item.id, e)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-1"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </section>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/30 shrink-0">
           <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
             <Zap className="w-3 h-3 text-indigo-400" />
             <span>Powered by Gemini 2.5 Flash</span>
           </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden bg-white lg:bg-[#FAFAFA]">
        
        {activeView === 'editor' ? (
          // === EDITOR VIEW ===
          <>
            {/* Header Toolbar */}
            <header className="h-16 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10 sticky top-0">
              <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </button>

                <div className="font-bold text-gray-800 flex items-center gap-2 lg:hidden">
                  <div className="bg-indigo-600 text-white p-1 rounded-md"><Sparkles className="w-3 h-3"/></div>
                  公众号助手
                </div>
              </div>
              
              <div className="hidden lg:block"></div> 

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleReset}
                  className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 rounded-lg transition-colors group"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                </button>
                
                <div className="h-6 w-px bg-gray-100 mx-1"></div>

                <button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all shadow-md shadow-indigo-100 border ${
                    isProcessing 
                      ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
                      : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在思考...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>AI 一键排版</span>
                    </>
                  )}
                </button>

                {hasProcessed && (
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all border ${
                      showCopySuccess
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {showCopySuccess ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4" />}
                    <span>{showCopySuccess ? '已复制' : '复制全文'}</span>
                  </button>
                )}
              </div>
            </header>

            {/* Split View Editor */}
            <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
              
              {/* Left: Input Editor */}
              <div className="flex-1 flex flex-col bg-white relative min-w-0 md:min-w-[350px] transition-all duration-300 h-[40vh] md:h-auto border-b md:border-b-0 md:border-r border-gray-100">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50 bg-white">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Input</span>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <button 
                        onClick={openImageGenModal}
                        className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-indigo-100"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>AI 生成图片</span>
                      </button>
                      <button 
                        onClick={insertImagePlaceholder}
                        className="flex items-center gap-1.5 text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-gray-200/50"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>插入图片</span>
                      </button>
                    </div>
                </div>

                <textarea
                    ref={textareaRef}
                    className="flex-1 w-full p-6 md:p-8 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-700 placeholder-gray-300"
                    placeholder="在此开始创作... (选中文本点击 AI 图片生成即可基于内容配图)"
                    value={rawText}
                    onChange={handleTextChange}
                    spellCheck={false}
                />
                
                {/* Film Strip Image Preview */}
                {images.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-4">
                    <div className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                       <ImageIcon className="w-3 h-3" />
                       Assets ({images.length})
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {images.map((img) => (
                        <div key={img.id} className="group relative flex-shrink-0 w-20 h-20 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-help">
                            <img src={img.previewUrl} className="w-full h-full object-cover" alt="thumbnail" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-black/50 px-2 py-1 rounded-full">{img.id}</span>
                            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Phone Preview */}
              <div className="flex-1 bg-[#F5F5F7] flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
                <div className="relative w-full max-w-[400px] h-full md:h-[90vh] max-h-[850px] bg-white rounded-2xl md:rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border-0 md:border-[8px] border-gray-800 overflow-hidden flex flex-col ring-1 ring-black/5">
                    {/* Notch area */}
                    <div className="h-8 bg-white hidden md:flex items-center justify-between px-6 shrink-0 z-10 relative">
                      <span className="text-[10px] font-bold text-gray-900">9:41</span>
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 h-6 w-32 bg-gray-800 rounded-b-2xl"></div>
                      <div className="flex gap-1">
                          <div className="w-4 h-2.5 rounded-[2px] border border-gray-300 bg-gray-900"></div>
                      </div>
                    </div>

                    {/* WeChat Header */}
                    <div className="h-11 border-b border-gray-50 flex items-center px-4 justify-between bg-white shrink-0 z-10">
                        <div className="flex items-center text-gray-900 gap-1">
                          <span className="text-[15px] font-medium tracking-tight">预览效果</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-80">
                           <div className="w-8 h-5 border border-gray-200/80 rounded-full flex items-center justify-center px-1 gap-[2px]">
                              <div className="w-1 h-1 rounded-full bg-black"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                              <div className="w-1 h-1 rounded-full bg-black"></div>
                          </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar scroll-smooth">
                      {!hasProcessed ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
                          <div className="w-24 h-24 rounded-3xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                              <Smartphone className="w-10 h-10 text-gray-200" />
                          </div>
                          <h3 className="text-gray-900 font-semibold mb-2">预览准备就绪</h3>
                          <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
                            在左侧输入内容，点击 "AI 一键排版" 即可生成微信文章样式
                          </p>
                        </div>
                      ) : (
                        <ArticleRenderer 
                          ref={previewRef}
                          blocks={blocks} 
                          theme={currentTheme}
                          images={images}
                          imageRatio={imageRatio}
                        />
                      )}
                    </div>

                    {/* Home Indicator */}
                    <div className="h-6 bg-white shrink-0 hidden md:flex justify-center items-center pb-2">
                      <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // === WRITER VIEW ===
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
               <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                  <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span>AI 创作助手</span>
               </div>
               <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
               >
                 <Menu className="w-5 h-5"/>
               </button>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#FAFAFA]">
              {/* Writer Input */}
              <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar lg:border-r border-gray-200">
                 <div className="max-w-2xl mx-auto space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-gray-900">开始你的创作</h2>
                      <p className="text-sm text-gray-500">输入主题，AI 将为你生成结构清晰的文章草稿。</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">文章主题 / Topic</label>
                        <input 
                          type="text" 
                          value={writerTopic}
                          onChange={(e) => setWriterTopic(e.target.value)}
                          placeholder="例如：2024年人工智能发展趋势..."
                          className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg shadow-sm placeholder:text-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">关键信息与背景 / Context</label>
                        <textarea 
                          value={writerContext}
                          onChange={(e) => setWriterContext(e.target.value)}
                          placeholder="补充你想包含的观点、受众群体、或者特定要求..."
                          className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base resize-none shadow-sm placeholder:text-gray-300"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-blue-100 text-blue-600`}>
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">联网搜索增强</div>
                              <div className="text-xs text-gray-500">使用 Google Search 获取最新资讯</div>
                            </div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={useSearch} onChange={(e) => setUseSearch(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                         </label>
                      </div>
                    </div>

                    <button
                      onClick={handleWriterGenerate}
                      disabled={isWriting || !writerTopic.trim()}
                      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                        isWriting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95'
                      }`}
                    >
                      {isWriting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      <span>{isWriting ? '正在创作中...' : '开始创作'}</span>
                    </button>
                 </div>
              </div>

              {/* Writer Output Preview */}
              {generatedArticle ? (
                <div className="flex-1 bg-white p-6 md:p-10 overflow-y-auto custom-scrollbar">
                   <div className="max-w-2xl mx-auto space-y-6">
                      <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur py-4 z-10 border-b border-gray-50">
                         <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Current Draft</h3>
                         <button 
                           onClick={handleImportToEditor}
                           className="flex items-center gap-2 text-sm font-semibold text-white bg-green-600 px-4 py-2 rounded-full hover:bg-green-700 shadow-lg shadow-green-100 transition-all hover:-translate-y-0.5"
                         >
                           <span>导入编辑器排版</span>
                           <ArrowRight className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="bg-white">
                         <h1 className="text-3xl font-extrabold mb-6 text-gray-900 leading-tight">{generatedArticle.title}</h1>
                         <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                           {generatedArticle.content}
                         </div>
                      </div>

                      {/* Sources */}
                      {generatedArticle.sources.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-gray-100">
                           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                             <Search className="w-3.5 h-3.5" />
                             参考来源 / Sources
                           </h4>
                           <div className="grid gap-2">
                             {generatedArticle.sources.map((source, idx) => (
                               <a 
                                 key={idx} 
                                 href={source.uri} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                               >
                                 <span className="text-sm text-gray-600 truncate font-medium group-hover:text-blue-700">{source.title}</span>
                                 <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400" />
                               </a>
                             ))}
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center bg-[#FAFAFA]">
                    <div className="text-gray-300">
                       <FileText className="w-20 h-20 mx-auto mb-6 opacity-20" />
                       <h3 className="text-xl font-semibold text-gray-400 mb-2">准备创作</h3>
                       <p className="text-sm opacity-60 max-w-xs mx-auto">
                         在左侧输入主题，或点击历史记录查看过往文章。
                       </p>
                    </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Image Generation Modal --- */}
        {isImgGenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsImgGenModalOpen(false)}></div>
             <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 scale-100">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    AI 图片生成
                  </h3>
                  <button onClick={() => setIsImgGenModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 bg-gray-50/30">
                   {/* Prompt Input */}
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">画面描述 / Prompt</label>
                     <textarea 
                        className="w-full h-28 p-4 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none text-sm leading-relaxed shadow-sm"
                        placeholder="描述你想要的图片内容，例如：未来城市的霓虹街道，赛博朋克风格..."
                        value={imgGenPrompt}
                        onChange={(e) => setImgGenPrompt(e.target.value)}
                        autoFocus
                     />
                     <p className="text-[11px] text-gray-400 px-1">支持中英文。选中文章段落可直接填入。</p>
                   </div>

                   {/* Options Grid */}
                   <div className="space-y-4">
                      {/* Model Selection */}
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 ml-1">模型 / Model</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                             onClick={() => setImgGenModel('flash')}
                             className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                               imgGenModel === 'flash'
                                 ? 'bg-white border-indigo-500 text-indigo-700 shadow-md ring-1 ring-indigo-500/20'
                                 : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                             }`}
                           >
                             <Zap className="w-4 h-4" />
                             <span>标准 (Flash)</span>
                           </button>
                           <button
                             onClick={() => setImgGenModel('pro')}
                             className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                               imgGenModel === 'pro'
                                 ? 'bg-gradient-to-br from-amber-50 to-white border-amber-500 text-amber-700 shadow-md ring-1 ring-amber-500/20'
                                 : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                             }`}
                           >
                             <Crown className="w-4 h-4" />
                             <span>高级 (Pro)</span>
                           </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Size Selection */}
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between ml-1">
                             <span>尺寸 / Size</span>
                             {imgGenModel === 'flash' && <span className="text-[10px] text-gray-400 font-normal bg-gray-100 px-1.5 rounded">Pro Only</span>}
                           </label>
                           <div className="flex gap-2">
                             {(['1K', '2K', '4K'] as ImageResolution[]).map(size => (
                               <button
                                  key={size}
                                  onClick={() => setImgGenSize(size)}
                                  disabled={imgGenModel === 'flash'}
                                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                    imgGenModel === 'flash'
                                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                      : imgGenSize === size 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                  }`}
                               >
                                 {size}
                               </button>
                             ))}
                           </div>
                        </div>

                        {/* Ratio Selection */}
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">比例 / Ratio</label>
                           <div className="flex gap-2">
                             {(['1:1', '4:3', '16:9'] as ImageGenAspectRatio[]).map(ratio => (
                               <button
                                  key={ratio}
                                  onClick={() => setImgGenRatio(ratio)}
                                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                    imgGenRatio === ratio 
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                  }`}
                               >
                                 {ratio}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                   <button 
                     onClick={() => setIsImgGenModalOpen(false)}
                     className="px-5 py-2.5 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                   >
                     取消
                   </button>
                   <button
                     onClick={handleImageGeneration}
                     disabled={isGeneratingImg || !imgGenPrompt.trim()}
                     className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
                        isGeneratingImg || !imgGenPrompt.trim() 
                          ? 'bg-indigo-200 shadow-none cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5'
                     }`}
                   >
                      {isGeneratingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      <span>{isGeneratingImg ? '生成中...' : '开始生成'}</span>
                   </button>
                </div>

             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
