"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  author_id: string;
  date: string;
  views: number;
  category: string;
  rating?: number;
}

interface BookDetail {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description: string;
}

export default function DetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isHeartActive, setIsHeartActive] = useState(false);
  const [activeTab, setActiveTab] = useState("일반");
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [book, setBook] = useState<BookDetail>({
    title: "제목 정보 없음",
    author: "저자 정보 없음",
    publisher: "출판사 정보 없음",
    pubDate: "출간일 정보 없음",
    cover: "",
    description: "도서 설명이 없습니다.",
  });

  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [ratingInput, setRatingInput] = useState(5);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);

  const averageRating = posts.filter(p => p.category === "추천").length > 0 
    ? (posts.filter(p => p.category === "추천").reduce((acc, cur) => acc + (cur.rating || 0), 0) / posts.filter(p => p.category === "추천").length).toFixed(1)
    : "0.0";

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const bookTitle = searchParams.get("title") || "";
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("book_title", bookTitle)
        .order("created_at", { ascending: false });

      if (data) {
        setPosts(data.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          author: p.nickname || p.author_email || "익명",
          author_id: p.author_id,
          date: new Date(p.created_at).toLocaleDateString(),
          views: p.views || 0,
          category: p.category || "일반",
          rating: p.rating || 0
        })));
      }
    };
    fetchUserAndPosts();
  }, [searchParams]);

  useEffect(() => {
    const normalize = (v: string | null) => (v ?? "").trim();
    const removeHtml = (v: string) => v.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

    setBook({
      title: normalize(searchParams.get("title")) || "제목 정보 없음",
      author: normalize(searchParams.get("author")) || "저자 정보 없음",
      publisher: normalize(searchParams.get("publisher")) || "출판사 정보 없음",
      pubDate: normalize(searchParams.get("pubDate")) || "출간일 정보 없음",
      cover: normalize(searchParams.get("cover")),
      description: removeHtml(normalize(searchParams.get("description"))) || "도서 설명이 없습니다.",
    });
  }, [searchParams]);

  const submitPost = async () => {
    if (!user) { alert("로그인이 필요합니다."); return; }
    if (!titleInput.trim()) { alert("제목을 입력해주세요."); return; }

    const category = activeTab.includes("추천") ? "추천" : activeTab.includes("질문") ? "질문" : "일반";

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: titleInput.trim(),
        content: contentInput.trim(),
        author_id: user.id,
        author_email: user.email,
        nickname: user.user_metadata?.nickname || user.email.split("@")[0],
        book_title: book.title,
        category: category,
        rating: category === "추천" ? ratingInput : null,
      })
      .select()
      .single();

    if (error) { alert("등록 실패"); return; }

    setPosts([{
      id: data.id,
      title: data.title,
      content: data.content,
      author: data.nickname || data.author_email,
      author_id: data.author_id,
      date: new Date(data.created_at).toLocaleDateString(),
      views: 0,
      category: data.category,
      rating: data.rating,
    }, ...posts]);
    setTitleInput(""); setContentInput(""); setRatingInput(5); setIsWriteModalOpen(false);
  };

  const openViewModal = async (postId: number) => {
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;
    await supabase.rpc("increment_views", { post_id: postId });
    const updated = [...posts];
    updated[postIndex].views += 1;
    setPosts(updated);
    setCurrentPost(updated[postIndex]);
    setIsViewModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4ede1] text-[#333] font-sans pb-20">
      <header className="flex items-center justify-between px-10 py-5 bg-[#e8ded1] border-b border-[#dcd1c1]">
        <Link href="/" className="flex items-center gap-3 font-bold hover:opacity-80 transition cursor-pointer decoration-transparent">
          <img src="/main_logo.png" alt="로고" className="w-[60px] h-[60px] object-contain" />
          <div className="flex flex-col">
            <span className="text-[28px] leading-none tracking-tight text-[#388ba8] font-black">BOOK<span className="text-[#d89345]">CONNECT</span></span>
            <span className="text-base font-bold text-[#555] mt-1">북커넥트</span>
          </div>
        </Link>
        <div className="flex items-center bg-white border border-[#000] rounded-full px-5 py-2 w-[500px] shadow-sm">
          <span className="mr-2 text-xl text-gray-400">🔍</span>
          <input type="text" placeholder="도서 이름을 입력해 주세요" className="border-none outline-none grow p-1 text-base bg-transparent placeholder-gray-300" />
          <span className="text-xl px-2 cursor-pointer">❌</span>
        </div>
        <div className="flex gap-6 items-center">
          <div className="w-10 h-10 rounded-full bg-[#f7ce7a] cursor-pointer hover:opacity-80 transition"></div>
          <div className="w-10 h-10 rounded-full bg-[#f7ce7a] cursor-pointer hover:opacity-80 transition"></div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto p-5 mt-5">
        <div className="text-4xl text-[#888] cursor-pointer mb-5 inline-block hover:text-black transition" onClick={() => router.back()}>←</div>

        <section className="flex gap-10 mb-12 flex-row items-center border-b pb-12 border-[#dcd1c1]">
          {book.cover ? (
            <img src={book.cover} className="w-[220px] h-[310px] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border-4 border-white object-cover" />
          ) : (
            <div className="w-[220px] h-[310px] bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400 border-4 border-white">책 표지 없음</div>
          )}
          <div className="max-w-[700px] min-h-[310px] flex-1 bg-[#fdf3cc] p-8 rounded-[40px] relative shadow-sm border-b-4 border-[#e5cd8d] flex flex-col justify-center">
            <div className={`absolute top-6 right-8 text-3xl cursor-pointer transition-all ${isHeartActive ? "text-red-500 scale-110" : "text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.3)]"}`} onClick={() => setIsHeartActive(!isHeartActive)}>♥</div>
            <h2 className="text-[32px] font-black mb-4 leading-tight text-[#222]">{book.title}</h2>
            <div className="text-[17px] space-y-1.5 font-bold text-[#666] mb-6">
              <p>저자: <span className="font-medium ml-1 text-[#333]">{book.author}</span></p>
              <p>출판사: <span className="font-medium ml-1 text-[#333]">{book.publisher}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex text-[#f1c40f] text-3xl">
                {[1,2,3,4,5].map(s => <span key={s}>{Number(averageRating) >= s ? "★" : Number(averageRating) >= s - 0.5 ? "★" : "☆"}</span>)}
              </div>
              <span className="text-2xl font-black text-[#222] mt-1">{averageRating}</span>
            </div>
          </div>
        </section>

        <nav className="flex gap-4 mb-8">
          {["일반", "추천", "질문"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-10 py-3.5 rounded-full border-2 font-black text-lg transition-all ${activeTab === t ? "bg-[#d4bc7c] border-[#b8a268] shadow-md scale-105" : "bg-white border-[#e5cd8d] text-[#a89f83] hover:bg-gray-50"}`}>{t === "추천" ? "⭐ 추천" : t === "질문" ? "❓ Q&A" : "📝 일반"}</button>
          ))}
        </nav>

        {activeTab === "추천" ? (
          <div className="flex gap-10 flex-col lg:flex-row items-start">
            <div className="lg:w-1/2 bg-white p-10 rounded-3xl border-2 border-[#e5cd8d] shadow-sm min-h-[500px]">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-2"><span className="text-[#d4bc7c]">■</span> 책소개</h3>
              <p className="leading-[1.8] text-lg text-[#444] whitespace-pre-wrap">{book.description}</p>
            </div>
            <div className="lg:w-1/2 border-l-4 border-[#ffedb5] pl-10 pt-4 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-3xl font-black text-[#222]">리뷰</h3>
                <button className="px-8 py-3 bg-[#d4bc7c] text-black font-black rounded-xl hover:bg-[#c4ac6c] transition-all shadow-sm" onClick={() => { if (!user) { alert("로그인이 필요합니다."); return; } setIsWriteModalOpen(true); }}>리뷰 쓰기</button>
              </div>
              <div className="space-y-6 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#d4bc7c] scrollbar-track-transparent">
                {posts.filter(p => p.category === "추천").length === 0 ? (
                  <div className="py-20 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-[#ddd]">첫 리뷰를 작성해 보세요!</div>
                ) : (
                  posts.filter(p => p.category === "추천").map(p => (
                    <div key={p.id} className="bg-white p-8 rounded-2xl border-2 border-[#f4ebd0] shadow-sm hover:shadow-md transition-all cursor-pointer relative" onClick={() => openViewModal(p.id)}>
                      <div className="absolute top-8 right-8 text-[#f1c40f] text-xl font-bold">{"★".repeat(p.rating || 0)}{"☆".repeat(5-(p.rating||0))}</div>
                      <div className="text-[#888] text-sm mb-2 font-bold">글쓴이 <span className="text-[#555]">{p.author}</span></div>
                      <h4 className="font-extrabold text-xl text-[#222] mb-3 line-clamp-1">{p.title}</h4>
                      <p className="text-[#555] leading-relaxed line-clamp-2">{p.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-[#e5cd8d] shadow-sm overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4bc7c] scrollbar-track-transparent">
              <table className="w-full text-center">
                <thead className="bg-[#fdfaf0] border-b-2 border-[#e5cd8d] sticky top-0 z-10">
                  <tr>
                    <th className="py-6 w-[10%] text-[#666] font-black">번호</th>
                    <th className="py-6 text-left px-8 text-[#666] font-black">제목</th>
                    <th className="py-6 w-[15%] text-[#666] font-black">작성자</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.filter(p => p.category === (activeTab === "질문" ? "질문" : "일반")).length === 0 ? (
                    <tr><td colSpan={3} className="py-24 text-gray-400 font-bold">게시글이 없습니다. '작성하기' 버튼을 눌러보세요.</td></tr>
                  ) : (
                    posts.filter(p => p.category === (activeTab === "질문" ? "질문" : "일반")).map(p => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-[#fdfaf0] transition-colors cursor-pointer" onClick={() => openViewModal(p.id)}>
                        <td className="py-6 text-gray-400">{p.id}</td>
                        <td className="py-6 text-left px-8 font-extrabold text-[#222]">{p.title}</td>
                        <td className="py-6 text-gray-500 font-medium">{p.author}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 flex justify-end bg-white border-t border-gray-100">
              <button className="px-10 py-3.5 bg-[#3b4890] text-white rounded-2xl font-black shadow-md hover:bg-[#2c366b] transition-all" onClick={() => { if (!user) { alert("로그인이 필요합니다."); return; } setIsWriteModalOpen(true); }}>새 글 작성하기</button>
            </div>
          </div>
        )}
      </main>

      {isWriteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={() => setIsWriteModalOpen(false)}>
          <div className="bg-white w-[800px] max-w-[95%] p-8 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6">{activeTab} 글쓰기</h2>
            <input type="text" value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="제목을 입력하세요" className="w-full p-4 border-2 border-[#eee] mb-5 rounded-xl outline-none focus:border-[#d4bc7c] transition-all font-bold text-lg" />
            {activeTab === "추천" && (
              <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl">
                <span className="font-black text-[#555] text-lg">내 별점:</span>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(s => <span key={s} className="cursor-pointer text-3xl text-[#f1c40f] hover:scale-110 transition-transform" onClick={() => setRatingInput(s)}>{ratingInput >= s ? "★" : "☆"}</span>)}
                </div>
              </div>
            )}
            <textarea value={contentInput} onChange={e => setContentInput(e.target.value)} className="w-full h-[350px] p-5 border-2 border-[#eee] mb-6 rounded-xl outline-none focus:border-[#d4bc7c] transition-all text-lg leading-relaxed resize-none" placeholder="내용을 입력하세요"></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsWriteModalOpen(false)} className="px-8 py-3.5 border-2 rounded-xl font-bold hover:bg-gray-50">취소</button>
              <button onClick={submitPost} className="px-10 py-3.5 bg-[#3b4890] text-white rounded-xl font-black hover:bg-[#2c366b] shadow-md transition-all">등록하기</button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && currentPost && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={() => setIsViewModalOpen(false)}>
          <div className="bg-white w-[850px] max-w-[95%] p-10 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6 border-b-2 border-gray-50 pb-6">
              <div>
                <h2 className="text-3xl font-black text-[#222] mb-2">{currentPost.title}</h2>
                <div className="text-[#888] font-bold">
                   {activeTab === "추천" && <span className="text-[#f1c40f] text-xl mr-3 font-bold">{"★".repeat(currentPost.rating || 0)}</span>}
                   {currentPost.author} | {currentPost.date}
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-3xl text-gray-300 hover:text-gray-500 transition-colors">✕</button>
            </div>
            <div className="min-h-[300px] max-h-[500px] overflow-y-auto text-xl leading-[1.8] text-[#444] whitespace-pre-wrap">{currentPost.content}</div>
            <div className="mt-8 flex justify-end">
              <button className="px-10 py-3.5 bg-gray-100 text-[#555] rounded-xl font-black hover:bg-gray-200 transition-all" onClick={() => setIsViewModalOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
