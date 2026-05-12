"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

// 게시물 타입 정의
interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
  views: number;
}

interface BookDetail {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string;
  description: string;
}

function DetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 상태 관리
  const [isHeartActive, setIsHeartActive] = useState(false);
  const [favorites, setFavorites] = useState<{ id: string; title: string; author: string; cover: string }[]>([]);
  const [activeTab, setActiveTab] = useState("일반");
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postCounter, setPostCounter] = useState(100000);
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
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  const [communityInfo, setCommunityInfo] = useState({
    date: "2026.04.01",
    creator: "youdonghyeon06",
    manager: "admin_book",
    desc: "",
  });

  useEffect(() => {
    const normalize = (value: string | null) => (value ?? "").trim();
    const removeHtml = (value: string) =>
      value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const fetchBookInfo = async () => {
      const id = searchParams.get("id");
      const title = searchParams.get("title");

      let commDate = searchParams.get("date");
      let commCreator = searchParams.get("creator");
      let commManager = searchParams.get("manager");
      let commDesc = searchParams.get("desc");

      if (id) {
        try {
          const stored = JSON.parse(localStorage.getItem("communities") || "[]");
          const found = stored.find((c: any) => c.id === id);
          if (found) {
            commDate = commDate || found.date;
            commCreator = commCreator || found.creator;
            commManager = commManager || found.manager;
            commDesc = commDesc || found.desc;
          }
        } catch (e) {}
      }

      // 커뮤니티 개설 정보 가져오기
      setCommunityInfo({
        date: commDate || "2026.04.01",
        creator: commCreator || "youdonghyeon06",
        manager: commManager || "admin_book",
        desc: commDesc || "",
      });

      // 만약 URL에 title 파라미터가 있다면 기존 로직 유지
      if (title) {
        setBook({
          title: normalize(title) || "제목 정보 없음",
          author: normalize(searchParams.get("author")) || "저자 정보 없음",
          publisher: normalize(searchParams.get("publisher")) || "출판사 정보 없음",
          pubDate: normalize(searchParams.get("pubDate")) || "출간일 정보 없음",
          cover: normalize(searchParams.get("cover")),
          description:
            removeHtml(normalize(searchParams.get("description"))) ||
            "도서 설명이 없습니다.",
        });
        return;
      }

      // id(isbn13 등 고유번호)만으로 접근한 경우 Aladin API 재요청
      if (id) {
        setIsLoadingBook(true);
        try {
          const res = await fetch(`/api/aladin/search?q=${id}`);
          const payload = await res.json();
          const item = payload.item?.[0];

          if (item) {
            setBook({
              title: item.title ?? "제목 정보 없음",
              author: item.author ?? "저자 정보 없음",
              publisher: item.publisher ?? "출판사 정보 없음",
              pubDate: item.pubDate ?? "출간일 정보 없음",
              cover: item.cover ?? "",
              description: removeHtml(item.description || "도서 설명이 없습니다."),
            });
          }
        } catch (error) {
          console.error("도서 정보를 불러오는데 실패했습니다.", error);
        } finally {
          setIsLoadingBook(false);
        }
      }
    };

    fetchBookInfo();
  }, [searchParams]);

  const [currentUser, setCurrentUser] = useState("익명사용자");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const currentDate = "2026.04.03";

  useEffect(() => {
    setCurrentUser(localStorage.getItem("userNickname") || "익명사용자");
    
    // 초기 즐겨찾기 상태 로드 (DB에서)
    const initSessionAndFavorites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserEmail(session?.user?.email ?? null);

      if (!session?.user) {
        setFavorites([]);
        setIsHeartActive(false);
        return;
      }

      const id = searchParams.get("id");
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", session.user.id);

        if (!error && data) {
          const mappedFavs = data.map((f: any) => ({
            id: f.book_id,
            title: f.title,
            author: f.author,
            cover: f.cover,
          }));
          setFavorites(mappedFavs);
          if (id && mappedFavs.some((fav: any) => fav.id === id)) {
            setIsHeartActive(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    initSessionAndFavorites();
  }, [searchParams]);

  const handleHeartToggle = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("로그인 후 이용할 수 있습니다.");
      return;
    }

    const id = searchParams.get("id");
    if (!id) return;

    if (isHeartActive) {
      // 삭제
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("book_id", id);
      
      if (!error) {
        setFavorites((prev) => prev.filter((fav) => fav.id !== id));
        setIsHeartActive(false);
      }
    } else {
      // 추가할 때 최대 3개 확인
      if (favorites.length >= 3) {
        alert("더이상 즐겨찾을 수 없습니다.");
        return;
      }

      const newFav = {
        user_id: session.user.id,
        book_id: id,
        title: book.title,
        author: book.author,
        cover: book.cover || "",
      };

      const { error } = await supabase.from("favorites").insert([newFav]);
      
      if (!error) {
        setFavorites((prev) => [
          ...prev,
          { id, title: book.title, author: book.author, cover: book.cover },
        ]);
        setIsHeartActive(true);
      } else {
        alert("즐겨찾기 추가에 실패했습니다.");
      }
    }
  };

  const handleDeleteCommunity = () => {
    if (confirm("정말로 커뮤니티를 삭제하시겠습니까? 관련 정보가 모두 삭제됩니다.")) {
      const id = searchParams.get("id");
      if (id) {
        const stored = JSON.parse(localStorage.getItem("communities") || "[]");
        const updated = stored.filter((c: any) => String(c.id) !== String(id));
        localStorage.setItem("communities", JSON.stringify(updated));
      }
      alert("커뮤니티가 삭제되었습니다.");
      router.push("/");
    }
  };

  // 글 등록 처리
  const submitPost = () => {
    if (!titleInput.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const newPost: Post = {
      id: postCounter,
      title: titleInput.trim(),
      content: contentInput.trim(),
      author: currentUser,
      date: currentDate,
      views: 0,
    };

    setPosts([newPost, ...posts]);
    setPostCounter((prev) => prev + 1);

    // 입력창 초기화 및 모달 닫기
    setTitleInput("");
    setContentInput("");
    setIsWriteModalOpen(false);
  };

  // 게시글 보기 처리
  const openViewModal = (postId: number) => {
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

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
              onClick={handleHeartToggle}
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
              {(currentUser === communityInfo.creator || currentUser === communityInfo.manager) && (
                <button 
                  onClick={handleDeleteCommunity}
                  className="mt-4 flex items-center gap-1 text-sm font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition shadow-sm border border-red-100"
                  title="해당 커뮤니티 삭제"
                >
                  <span className="text-base">🗑️</span> 커뮤니티 삭제
                </button>
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
            커뮤니티 개설일: {communityInfo.date} <br />
            최초 개설자: {communityInfo.creator} <br />
            커뮤니티 매니저: {communityInfo.manager} <br />
            방문자 수: 1,204 명<br />
            즐겨찾기 수: 342 명<br />
            <br />
            설명: {communityInfo.desc || `${book.title}에 대해 이야기하는 공간입니다.`}
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
            onClick={() => setIsWriteModalOpen(true)}
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

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4ede1] flex items-center justify-center font-bold text-xl">로딩중...</div>}>
      <DetailPageContent />
    </Suspense>
  );
}
