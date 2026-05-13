"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 게시글 타입 정의
// status 추가: 일반, 추천, 질문 등 탭 분류용
interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  author_id: string;
  date: string;
  views: number;
  category: string;
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

  // 상태 관리
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

  // 글쓰기 입력 상태
  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");

  // 현재 보고 있는 게시글 상태
  const [currentPost, setCurrentPost] = useState<Post | null>(null);

  // 세션 정보 및 게시글 가져오기
  useEffect(() => {
    const fetchUserAndPosts = async () => {
      // 세션 정보 확인
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // 게시글 데이터 가져오기 (해당 도서의 게시글만)
      const bookTitle = searchParams.get("title") || "";
      const { data, error } = await supabase
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
          category: p.category || "일반"
        })));
      }
    };

    fetchUserAndPosts();
  }, [searchParams]);

  useEffect(() => {
    const normalize = (value: string | null) => (value ?? "").trim();
    const removeHtml = (value: string) =>
      value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const nextBook: BookDetail = {
      title: normalize(searchParams.get("title")) || "제목 정보 없음",
      author: normalize(searchParams.get("author")) || "저자 정보 없음",
      publisher: normalize(searchParams.get("publisher")) || "출판사 정보 없음",
      pubDate: normalize(searchParams.get("pubDate")) || "출간일 정보 없음",
      cover: normalize(searchParams.get("cover")),
      description:
        removeHtml(normalize(searchParams.get("description"))) ||
        "도서 설명이 없습니다.",
    };

    setBook(nextBook);
  }, [searchParams]);

  // 글 등록 처리
  const submitPost = async () => {
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }

    if (!titleInput.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: titleInput.trim(),
        content: contentInput.trim(),
        author_id: user.id,
        author_email: user.email,
        nickname: user.user_metadata?.nickname || user.email.split("@")[0],
        book_title: book.title,
        category: activeTab.split(" ")[1] || "일반", // 탭 이름에서 이모지 제외 시도
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting post:", error);
      alert("게시글 등록에 실패했습니다.");
      return;
    }

    const newPost: Post = {
      id: data.id,
      title: data.title,
      content: data.content,
      author: data.nickname || data.author_email,
      author_id: data.author_id,
      date: new Date(data.created_at).toLocaleDateString(),
      views: 0,
      category: data.category,
    };

    setPosts([newPost, ...posts]);

    // 입력창 초기화 및 모달 닫기
    setTitleInput("");
    setContentInput("");
    setIsWriteModalOpen(false);
  };

  // 게시글 보기 처리
  const openViewModal = async (postId: number) => {
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    // DB 조회수 증가
    await supabase.rpc("increment_views", { post_id: postId });

    // 조회수 1 증가 (불변성 유지)
    const updatedPosts = [...posts];
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      views: updatedPosts[postIndex].views + 1,
    };

    setPosts(updatedPosts);
    setCurrentPost(updatedPosts[postIndex]);
    setIsViewModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf0] text-[#333] font-sans pb-20">
      {/* 헤더 영역 */}
      <header className="flex items-center justify-between px-10 py-4 bg-[#f4ebd0] border-b-2 border-[#e0d5b5]">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-2xl text-[#008080] hover:opacity-80 transition cursor-pointer decoration-transparent"
        >
          <img
            src="/main_logo.png"
            alt="북커넥트 로고"
            className="w-12 h-12 object-contain"
          />
          <div className="leading-tight">
            BOOKCONNECT
            <br />
            <span className="text-sm font-normal text-[#555]">북커넥트</span>
          </div>
        </Link>
        <div className="flex items-center bg-white border-2 border-[#333] rounded-full px-4 py-1.5 w-[400px]">
          <span className="mr-2">📖</span>
          <input
            type="text"
            placeholder="도서 이름을 입력해 주세요"
            className="border-none outline-none grow p-1 text-base bg-transparent"
          />
          <span className="text-xl cursor-pointer">🔍</span>
        </div>
        <div className="flex gap-4 text-3xl text-[#a89f83] cursor-pointer">
          <span className="hover:text-[#8a826b] transition">👤</span>
          <span className="hover:text-[#8a826b] transition">⚙️</span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1100px] mx-auto p-5 mt-5">
        <div
          className="text-4xl text-[#888] cursor-pointer mb-5 inline-block hover:text-black transition"
          onClick={() => router.back()}
        >
          ⇦
        </div>

        {/* 상단: 책 정보 및 커뮤니티 정보 영역 */}
        <section className="flex gap-5 mb-8 flex-col md:flex-row">
          {book.cover ? (
            <img
              src={book.cover}
              alt={`${book.title} 표지`}
              className="w-[200px] h-[280px] rounded-xl shadow-md shrink-0 object-cover"
            />
          ) : (
            <div className="w-[200px] h-[280px] bg-[#ddd] rounded-xl shadow-md shrink-0 flex items-center justify-center text-gray-500 font-bold">
              책 표지 없음
            </div>
          )}
          <div className="bg-[#f4ebd0] p-6 rounded-md shadow-sm relative flex-1">
            <div
              className={`absolute top-5 right-5 text-3xl cursor-pointer transition-colors duration-300 select-none ${
                isHeartActive ? "text-[#e74c3c]" : "text-[#ccc]"
              }`}
              onClick={() => setIsHeartActive(!isHeartActive)}
            >
              ♥
            </div>
            <div className="mb-6">
              <h2 className="text-[32px] font-extrabold tracking-tight text-gray-900 leading-snug">
                {book.title.split(" - ")[0].trim()}
              </h2>
              {book.title.includes(" - ") && (
                <p className="text-[17px] text-gray-600 mt-2 font-medium">
                  {book.title.split(" - ").slice(1).join(" - ").trim()}
                </p>
              )}
            </div>
            <p className="text-lg leading-relaxed text-[#555] font-bold">
              저자: {book.author}
              <br />
              출판사: {book.publisher}
              <br />
              출간일: {book.pubDate}
            </p>
          </div>
          <div className="bg-[#f4ebd0] p-6 rounded-md shadow-sm flex-1 text-[15px] leading-loose text-[#555] font-bold">
            커뮤니티 개설일: 2026.04.01 <br />
            최초 개설자: youdonghyeon06 <br />
            커뮤니티 매니저: admin_book <br />
            방문자 수: 1,204 명<br />
            즐겨찾기 수: 342 명<br />
            <br />
            설명: {book.title}에 대해 이야기하는 공간입니다.
          </div>
        </section>

        {/* 중단: 탭 메뉴 및 글쓰기 버튼 */}
        <section className="flex justify-between items-end mb-4 border-b-2 border-transparent">
          <div className="flex gap-2.5">
            {["💬 일반", "⭐ 추천", "Q&A 질문"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-lg font-bold rounded-full border-2 transition-all duration-100 ${
                  activeTab === tab
                    ? "bg-[#d4bc7c] border-[#b8a268] translate-y-0.5 shadow-none text-black"
                    : "bg-[#e5cd8d] border-[#b8a268] shadow-[0_3px_0_rgba(0,0,0,0.2)] text-black/80 hover:bg-[#deca86]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            className="px-6 py-2 text-base font-bold bg-[#fdfaf0] border-2 border-[#e5cd8d] rounded-full text-[#555] hover:bg-[#e5cd8d] hover:text-[#333] transition-colors"
            onClick={() => {
              if (!user) {
                alert("로그인이 필요한 서비스입니다.");
                return;
              }
              setIsWriteModalOpen(true);
            }}
          >
            글쓰기
          </button>
        </section>

        {/* 게시판 영역 */}
        <section className="border-t-4 border-[#e5cd8d] bg-white rounded-b-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="w-[10%] py-4 px-2.5 border-b-2 border-[#e5cd8d] text-[#666] font-bold">
                  번호
                </th>
                <th className="w-[60%] py-4 px-2.5 border-b-2 border-[#e5cd8d] text-[#666] font-bold">
                  제목
                </th>
                <th className="w-[15%] py-4 px-2.5 border-b-2 border-[#e5cd8d] text-[#666] font-bold">
                  글쓴이
                </th>
                <th className="w-[15%] py-4 px-2.5 border-b-2 border-[#e5cd8d] text-[#666] font-bold">
                  조회수
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-[#999]">
                    등록된 게시물이 없습니다. '글쓰기' 버튼을 눌러 작성해보세요.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-2.5 border-b border-[#ddd] text-[#444]">
                      {post.id}
                    </td>
                    <td
                      className="py-4 px-5 border-b border-[#ddd] text-left text-black font-medium cursor-pointer hover:underline hover:text-[#0056b3]"
                      onClick={() => openViewModal(post.id)}
                    >
                      {post.title}
                    </td>
                    <td className="py-4 px-2.5 border-b border-[#ddd] text-[#444]">
                      {post.author}
                    </td>
                    <td className="py-4 px-2.5 border-b border-[#ddd] text-[#444]">
                      {post.views}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 하단 책소개 / 작가 정보 */}
        <section className="mt-10 flex gap-5">
          <div className="flex-1 bg-[#f4ebd0]/30 p-6 rounded-xl border border-[#e0d5b5]/50">
            <h3 className="mb-2.5 text-xl font-bold">책소개</h3>
            <p className="text-[#666] leading-relaxed mb-6">
              {book.description}
            </p>

            <h3 className="mb-2.5 text-xl font-bold">작가 정보</h3>
            <p className="text-[#666] leading-relaxed">
              {book.author} 작가의 작품입니다. 커뮤니티에서 독서 후기와 감상을
              공유해 보세요.
            </p>
          </div>
        </section>
      </main>

      {/* 1. 글쓰기 모달 */}
      {isWriteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
          onClick={() => setIsWriteModalOpen(false)}
        >
          <div
            className="bg-white w-[800px] max-w-[90%] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#ddd] p-4 bg-gray-50">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="제목을 입력해 주세요."
                className="w-full p-3 border border-[#ccc] rounded-md text-base outline-none focus:border-[#388ba8] transition-colors"
                autoFocus
              />
              <p className="text-[11px] text-[#888] mt-2 leading-relaxed">
                ※ 음란물, 차별, 비하, 혐오 및 초상권 침해 게시물은 책임을
                질 수 있습니다.
              </p>
            </div>

            <div className="p-2.5 bg-[#f9f9f9] border-b border-[#ddd] flex gap-2.5 text-[13px] text-[#555] overflow-x-auto">
              {["📷 이미지", "🎥 동영상", "🔗 링크", "B", "I", "U"].map(
                (tool, i) => (
                  <span
                    key={i}
                    className="border border-[#ccc] px-3 py-1.5 bg-white cursor-pointer rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    {tool}
                  </span>
                ),
              )}
            </div>

            <div className="flex-1 p-0 bg-white">
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="내용을 입력하세요."
                className="w-full h-[350px] border-none p-5 text-[15px] outline-none resize-none leading-relaxed"
              ></textarea>
            </div>

            <div className="p-4 bg-[#f1f1f1] text-right border-t border-[#ddd] flex justify-end gap-2.5">
              <button
                className="px-5 py-2.5 bg-[#666] text-white rounded-md font-bold hover:bg-[#555] transition-colors"
                onClick={() => setIsWriteModalOpen(false)}
              >
                취소
              </button>
              <button
                className="px-6 py-2.5 bg-[#3b4890] text-white rounded-md font-bold hover:bg-[#2c366b] transition-colors shadow-sm"
                onClick={submitPost}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 게시글 보기 모달 */}
      {isViewModalOpen && currentPost && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="bg-white w-[800px] max-w-[90%] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#eee] bg-gray-50">
              <div className="text-[22px] font-bold mb-2 text-[#222]">
                {currentPost.title}
              </div>
              <div className="text-[13px] text-[#888] flex items-center justify-between">
                <span>
                  {currentPost.author} | {currentPost.date}
                </span>
                <span>조회수: {currentPost.views}</span>
              </div>
            </div>

            <div className="p-6 min-h-[300px] text-base leading-[1.8] overflow-y-auto whitespace-pre-wrap bg-white text-[#444]">
              {currentPost.content}
            </div>

            <div className="p-4 border-t border-[#eee] text-right bg-gray-50">
              <button
                className="px-6 py-2.5 bg-[#ddd] text-[#333] border-none rounded-md cursor-pointer font-bold hover:bg-[#ccc] transition-colors"
                onClick={() => setIsViewModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
