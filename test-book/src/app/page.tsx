"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../lib/supabase";

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  cover: string | null;
  isbn13?: string | null;
  publisher?: string | null;
  pubDate?: string | null;
  description?: string | null;
};

const GENRES = [
  { id: "novel", name: "소설" },
  { id: "comic", name: "만화" },
  { id: "essay", name: "에세이" },
  { id: "culture", name: "교양" },
  { id: "reference", name: "참고서" },
  { id: "language", name: "어학" },
  { id: "practical", name: "실용" },
  { id: "kids", name: "아동" },
];

function getCategoryKeywords(category: string): string[] {
  switch (category) {
    case "소설":
      return ["현대 소설", "소설 베스트셀러"];
    case "만화":
      return ["만화", "코믹스", "웹툰", "순정만화"];
    case "에세이":
      return ["에세이 베스트셀러", "산문"];
    case "교양":
      return ["경제경영", "자기계발", "인문학"];
    case "참고서":
      return ["수험서", "자격증"];
    case "어학":
      return ["ELT", "해외 대학교재"];
    case "실용":
      return ["컴퓨터", "기계공학"];
    case "아동":
      return ["어린이", "유아"];
    default:
      return [category];
  }
}

export default function Home() {
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [novelBooks, setNovelBooks] = useState<BookRow[]>([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [fetchingRealBooks, setFetchingRealBooks] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // HOT/NEW 커뮤니티
  const [hotBooks, setHotBooks] = useState<BookRow[]>([]);
  const [newBooks, setNewBooks] = useState<BookRow[]>([]);
  const [hotTab, setHotTab] = useState("소설");
  const [hotLoading, setHotLoading] = useState(false);
  const [newLoading, setNewLoading] = useState(false);

  // 장르별 도서
  const [genreBooks, setGenreBooks] = useState<Record<string, BookRow[]>>({});
  const [genreLoading, setGenreLoading] = useState<Record<string, boolean>>({});

  // 자세히 보기 모달용 18개 도서
  const [detailBooks, setDetailBooks] = useState<BookRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetailGenre, setSelectedDetailGenre] = useState("");
  const [isNicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [isNicknameDuplicate, setIsNicknameDuplicate] = useState(false);

  // 커뮤니티 개설 모달 내 검색
  const [createSearchKeyword, setCreateSearchKeyword] = useState("");
  const [createSearchBooks, setCreateSearchBooks] = useState<BookRow[]>([]);
  const [isCreateSearching, setIsCreateSearching] = useState(false);
  const [createSearchError, setCreateSearchError] = useState<string | null>(null);
  const [createdCommunityIds, setCreatedCommunityIds] = useState<string[]>([]);

  // 즐겨찾기 상태 추가
  const [favorites, setFavorites] = useState<{ id: string; title: string; author: string; cover: string }[]>([]);

  useEffect(() => {
    const loadFavorites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setFavorites([]);
        return;
      }

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
        }
      } catch (e) {
        console.error("즐겨찾기 목록을 불러오는 중 오류:", e);
      }
    };

    loadFavorites();
    // 창 전환 시 업데이트 (새로고침 없이 동기화)
    window.addEventListener("focus", loadFavorites);
    return () => window.removeEventListener("focus", loadFavorites);
  }, [userEmail]); // userEmail이 변경(로그인/로그아웃)될 때마다 재실행

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setShowSearchPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 페이지 로드 시 HOT/NEW 커뮤니티 및 장르별 도서 로드
  useEffect(() => {
    fetchHotCommunity("소설");
    fetchNewCommunity();
    GENRES.forEach((genre) => {
      fetchGenreBooks(genre.name);
    });
  }, []);

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email ?? null);
      
      if (session?.user) {
        let nickname = session.user.user_metadata?.nickname || null;
        
        // 예약된 닉네임인 경우 자동으로 사용자X 형식으로 변경
        if (nickname && RESERVED_NICKNAMES.includes(nickname)) {
          let newNickname = "";
          let userNumber = 1;
          let isAvailable = false;

          // 사용자1, 사용자2, 사용자3... 형식으로 중복 없는 닉네임 찾기
          while (!isAvailable) {
            newNickname = `사용자${userNumber}`;
            const { data: existingUsers } = await supabase
              .from('profiles')
              .select('id')
              .eq('nickname', newNickname);
            
            if (!existingUsers || existingUsers.length === 0) {
              isAvailable = true;
            } else {
              userNumber++;
            }
          }

          // 새로운 닉네임으로 업데이트
          await supabase.auth.updateUser({
            data: { nickname: newNickname }
          });

          await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              nickname: newNickname,
              updated_at: new Date(),
            });

          localStorage.setItem("userNickname", newNickname);
          nickname = newNickname;
        }
        
        if (nickname) {
          localStorage.setItem("userNickname", nickname);
        } else if (session.user.app_metadata?.provider === "github") {
          // GitHub 로그인인데 닉네임이 없으면 모달 열기
          setNicknameModalOpen(true);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      
      if (session?.user) {
        let nickname = session.user.user_metadata?.nickname || null;
        
        // 예약된 닉네임인 경우 자동으로 사용자X 형식으로 변경
        if (nickname && RESERVED_NICKNAMES.includes(nickname)) {
          let newNickname = "";
          let userNumber = 1;
          let isAvailable = false;

          while (!isAvailable) {
            newNickname = `사용자${userNumber}`;
            const { data: existingUsers } = await supabase
              .from('profiles')
              .select('id')
              .eq('nickname', newNickname);
            
            if (!existingUsers || existingUsers.length === 0) {
              isAvailable = true;
            } else {
              userNumber++;
            }
          }

          await supabase.auth.updateUser({
            data: { nickname: newNickname }
          });

          await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              nickname: newNickname,
              updated_at: new Date(),
            });

          localStorage.setItem("userNickname", newNickname);
          nickname = newNickname;
        }

        if (nickname) {
          localStorage.setItem("userNickname", nickname);
        } else if (session.user.app_metadata?.provider === "github") {
          setNicknameModalOpen(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }

    setPassword("");
    setAuthLoading(false);
  };

  const handleGithubLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
    setNicknameInput("");
  };

  // 예약된 닉네임 목록
  const RESERVED_NICKNAMES = ["이재준", "유동현"];
  // 중복으로 취급될 닉네임 (이미 사용 중인 것처럼 처리)
  const BLOCKED_NICKNAMES = ["고양이", "강아지"];

  const handleCheckNickname = async (nickname: string) => {
    if (!nickname.trim()) {
      setIsNicknameDuplicate(false);
      return;
    }

    // 예약된 닉네임 확인
    if (RESERVED_NICKNAMES.includes(nickname.trim())) {
      setIsNicknameDuplicate(true);
      return;
    }

    // 중복으로 취급될 닉네임 확인
    if (BLOCKED_NICKNAMES.includes(nickname.trim())) {
      setIsNicknameDuplicate(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.trim())
        .neq('id', userEmail); // 현재 사용자는 제외

      if (error) {
        // profiles 테이블이 없을 수 있으니 무시
        setIsNicknameDuplicate(false);
        return;
      }

      setIsNicknameDuplicate(data && data.length > 0);
    } catch (err) {
      setIsNicknameDuplicate(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!nicknameInput.trim()) {
      setAuthError("닉네임을 입력해주세요.");
      return;
    }

    if (RESERVED_NICKNAMES.includes(nicknameInput.trim())) {
      setAuthError("사용할 수 없는 닉네임입니다.");
      return;
    }

    if (BLOCKED_NICKNAMES.includes(nicknameInput.trim())) {
      setAuthError("사용 중인 닉네임입니다.");
      return;
    }

    if (isNicknameDuplicate) {
      setAuthError("사용 중인 닉네임입니다.");
      return;
    }

    const { data: { user }, error } = await supabase.auth.updateUser({
      data: { nickname: nicknameInput.trim() }
    });

    if (error) {
      setAuthError(error.message);
    } else {
      // Supabase profiles 테이블에 닉네임 저장
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          nickname: nicknameInput.trim(),
          updated_at: new Date(),
        });

      if (!profileError) {
        // localStorage에도 닉네임 저장
        localStorage.setItem("userNickname", nicknameInput.trim());
      }

      setUserEmail(user?.email ?? null);
      setNicknameInput("");
      setNicknameModalOpen(false);
      setIsNicknameDuplicate(false);
    }
  };

  // ===================== HOT/NEW 커뮤니티 함수 =====================
  const fetchHotCommunity = async (tabName: string) => {
    setHotTab(tabName);
    setHotLoading(true);
    try {
      const keywords = getCategoryKeywords(tabName);
      const allResults: BookRow[] = [];

      for (const keyword of keywords) {
        const res = await fetch(
          `/api/aladin/search?q=${encodeURIComponent(keyword)}`
        );
        const payload = (await res.json()) as { item?: Array<any> };
        if (!res.ok) continue;

        const items = Array.isArray(payload?.item) ? payload.item : [];
        items.forEach((item: any, index: number) => {
          allResults.push({
            id: item.itemId ?? (Number(item.isbn13) || index + 1),
            title: item.title ?? "제목 없음",
            author: item.author ?? null,
            cover: item.cover ?? null,
            isbn13: item.isbn13 ?? item.isbn ?? null,
            publisher: item.publisher ?? null,
            pubDate: item.pubDate ?? null,
            description: item.description ?? null,
          });
        });
      }

      // 중복 제거 (기본 작품명 기준)
      const uniqueMap = new Map<string, BookRow>();
      allResults.forEach((book) => {
        const mainTitle = book.title.split(" - ")[0].trim();
        const baseTitle = mainTitle.replace(/\s*\d+권?$/, "").trim();
        if (!uniqueMap.has(baseTitle)) {
          uniqueMap.set(baseTitle, book);
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());
      const shuffled = uniqueItems.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 6);

      setHotBooks(selected);
    } catch (err) {
      console.error("HOT 커뮤니티 로드 실패:", err);
    } finally {
      setHotLoading(false);
    }
  };

  const fetchNewCommunity = async () => {
    setNewLoading(true);
    try {
      const keywords = ["신간", "종합 베스트셀러", "에세이", "교양"];
      const allResults: BookRow[] = [];

      for (const keyword of keywords) {
        const res = await fetch(
          `/api/aladin/search?q=${encodeURIComponent(keyword)}`
        );
        const payload = (await res.json()) as { item?: Array<any> };
        if (!res.ok) continue;

        const items = Array.isArray(payload?.item) ? payload.item : [];
        items.forEach((item: any, index: number) => {
          allResults.push({
            id: item.itemId ?? (Number(item.isbn13) || index + 1),
            title: item.title ?? "제목 없음",
            author: item.author ?? null,
            cover: item.cover ?? null,
            isbn13: item.isbn13 ?? item.isbn ?? null,
            publisher: item.publisher ?? null,
            pubDate: item.pubDate ?? null,
            description: item.description ?? null,
          });
        });
      }

      const uniqueMap = new Map<string, BookRow>();
      allResults.forEach((book) => {
        const mainTitle = book.title.split(" - ")[0].trim();
        const baseTitle = mainTitle.replace(/\s*\d+권?$/, "").trim();
        if (!uniqueMap.has(baseTitle)) {
          uniqueMap.set(baseTitle, book);
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());
      const shuffled = uniqueItems.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 4);

      setNewBooks(selected);
    } catch (err) {
      console.error("NEW 커뮤니티 로드 실패:", err);
    } finally {
      setNewLoading(false);
    }
  };

  const fetchGenreBooks = async (genre: string) => {
    setGenreLoading((prev) => ({ ...prev, [genre]: true }));
    try {
      const keywords = getCategoryKeywords(genre);
      const allResults: BookRow[] = [];

      for (const keyword of keywords) {
        const res = await fetch(
          `/api/aladin/search?q=${encodeURIComponent(keyword)}`
        );
        const payload = (await res.json()) as { item?: Array<any> };
        if (!res.ok) continue;

        const items = Array.isArray(payload?.item) ? payload.item : [];
        items.forEach((item: any, index: number) => {
          allResults.push({
            id: item.itemId ?? (Number(item.isbn13) || index + 1),
            title: item.title ?? "제목 없음",
            author: item.author ?? null,
            cover: item.cover ?? null,
            isbn13: item.isbn13 ?? item.isbn ?? null,
            publisher: item.publisher ?? null,
            pubDate: item.pubDate ?? null,
            description: item.description ?? null,
          });
        });
      }

      const uniqueMap = new Map<string, BookRow>();
      allResults.forEach((book) => {
        const mainTitle = book.title.split(" - ")[0].trim();
        const baseTitle = mainTitle.replace(/\s*\d+권?$/, "").trim();
        if (!uniqueMap.has(baseTitle)) {
          uniqueMap.set(baseTitle, book);
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());
      const shuffled = uniqueItems.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 4);

      setGenreBooks((prev) => ({ ...prev, [genre]: selected }));
    } catch (err) {
      console.error(`${genre} 책 로드 실패:`, err);
    } finally {
      setGenreLoading((prev) => ({ ...prev, [genre]: false }));
    }
  };

  // 자세히 보기 - 18개 도서
  const openDetailModal = async (genre: string) => {
    setSelectedDetailGenre(genre);
    setDetailLoading(true);
    setDetailModalOpen(true);

    try {
      const keywords = getCategoryKeywords(genre);
      const allResults: BookRow[] = [];

      for (const keyword of keywords) {
        const res = await fetch(
          `/api/aladin/search?q=${encodeURIComponent(keyword)}`
        );
        const payload = (await res.json()) as { item?: Array<any> };
        if (!res.ok) continue;

        const items = Array.isArray(payload?.item) ? payload.item : [];
        items.forEach((item: any, index: number) => {
          allResults.push({
            id: item.itemId ?? (Number(item.isbn13) || index + 1),
            title: item.title ?? "제목 없음",
            author: item.author ?? null,
            cover: item.cover ?? null,
            isbn13: item.isbn13 ?? item.isbn ?? null,
            publisher: item.publisher ?? null,
            pubDate: item.pubDate ?? null,
            description: item.description ?? null,
          });
        });
      }

      const uniqueMap = new Map<string, BookRow>();
      allResults.forEach((book) => {
        const mainTitle = book.title.split(" - ")[0].trim();
        const baseTitle = mainTitle.replace(/\s*\d+권?$/, "").trim();
        if (!uniqueMap.has(baseTitle)) {
          uniqueMap.set(baseTitle, book);
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());
      const shuffled = uniqueItems.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 18);

      setDetailBooks(selected);
    } catch (err) {
      console.error(`${genre} 상세 로드 실패:`, err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFetchRealBooks = async () => {
    const query = searchKeyword.trim();
    if (!query) return;

    setShowSearchPanel(true);
    setBooksError(null);
    setIsBooksLoading(true);
    setFetchingRealBooks(true);

    try {
      const res = await fetch(
        `/api/aladin/search?q=${encodeURIComponent(query)}`,
      );

      const payload = (await res.json()) as {
        item?: Array<any>;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error ?? "실제 도서 조회에 실패했습니다.");
      }

      const items = Array.isArray(payload?.item) ? payload.item : [];
      const mapped: BookRow[] = items
        .slice(0, 8)
        .map((item: any, index: number) => ({
          id: item.itemId ?? (Number(item.isbn13) || index + 1),
          title: item.title ?? "제목 없음",
          author: item.author ?? null,
          cover: item.cover ?? null,
          isbn13: item.isbn13 ?? item.isbn ?? null,
          publisher: item.publisher ?? null,
          pubDate: item.pubDate ?? null,
          description: item.description ?? null,
        }));

      setNovelBooks(mapped);
      setIsBooksLoading(false);
    } catch (err: any) {
      const message = err?.message ?? "실제 도서 조회에 실패했습니다.";
      setBooksError(message);
    } finally {
      setFetchingRealBooks(false);
    }
  };

  const handleCreateSearch = async () => {
    if (!createSearchKeyword.trim()) return;

    setIsCreateSearching(true);
    setCreateSearchError(null);
    setCreateSearchBooks([]);

    try {
      const res = await fetch(
        `/api/aladin/search?q=${encodeURIComponent(createSearchKeyword)}`
      );
      const payload = (await res.json()) as { item?: Array<any>; error?: string };

      if (!res.ok) throw new Error(payload.error ?? "도서 검색에 실패했습니다.");

      const items = Array.isArray(payload?.item) ? payload.item : [];
      const mapped = items.map((item: any, index: number) => ({
        id: item.itemId ?? (Number(item.isbn13) || index + 1),
        title: item.title ?? "제목 없음",
        author: item.author ?? null,
        cover: item.cover ?? null,
        isbn13: item.isbn13 ?? item.isbn ?? null,
        publisher: item.publisher ?? null,
        pubDate: item.pubDate ?? null,
        description: item.description ?? null,
      }));

      // 중복 제거
      const uniqueMap = new Map<string, BookRow>();
      mapped.forEach((book) => {
        const mainTitle = book.title.split(" - ")[0].trim();
        const baseTitle = mainTitle.replace(/\s*\d+권?$/, "").trim();
        if (!uniqueMap.has(baseTitle)) {
          uniqueMap.set(baseTitle, book);
        }
      });

      setCreateSearchBooks(Array.from(uniqueMap.values()).slice(0, 10));
    } catch (err: any) {
      setCreateSearchError(err.message ?? "도서 검색에 실패했습니다.");
    } finally {
      setIsCreateSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4ede1] text-[#333] font-sans">
      {/* 헤더 */}
      <header className="flex justify-between items-center px-10 py-5 bg-[#e8ded1]">
        <Link
          href="/"
          className="shrink-0 flex items-center gap-2"
          aria-label="메인 페이지로 이동"
        >
          <Image
            src="/main_logo.png"
            alt="북커넥트 로고"
            width={200}
            height={200}
            priority
            className="h-auto w-[90px]"
          />
          <div className="leading-tight">
            <div className="text-[34px] font-black tracking-tight">
              <span className="text-[#1f7f95]">BOOK</span>
              <span className="text-[#d7893b]">CONNECT</span>
            </div>
            <span className="text-[26px] font-extrabold text-[#1b5f76]">
              북커넥트
            </span>
          </div>
        </Link>
        <div ref={searchBoxRef} className="relative w-[500px]">
          <div className="flex items-center bg-white border-2 border-black rounded-3xl px-5 py-1.5 w-full">
            <span>📖</span>
            <input
              type="text"
              placeholder="도서 이름을 입력해 주세요"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setShowSearchPanel(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFetchRealBooks();
                }
              }}
              className="border-none outline-none w-full text-base px-3 py-1"
            />
            <button
              type="button"
              onClick={handleFetchRealBooks}
              className="text-xl"
              title="실제 도서 검색"
            >
              🔍
            </button>
          </div>

          {showSearchPanel && (
            <div className="absolute top-[56px] left-0 w-full bg-white border border-[#d9d9d9] rounded-xl shadow-lg z-30 max-h-[760px] overflow-y-auto">
              {isBooksLoading && (
                <div className="w-full text-center text-sm font-semibold text-gray-600 py-8">
                  책 정보를 불러오는 중입니다...
                </div>
              )}

              {!isBooksLoading && booksError && (
                <div className="w-full text-center text-sm font-semibold text-red-600 py-8 px-4 break-words">
                  {booksError}
                </div>
              )}

              {!isBooksLoading && !booksError && novelBooks.length === 0 && (
                <div className="w-full text-center text-sm font-semibold text-gray-600 py-8">
                  검색 결과가 없습니다.
                </div>
              )}

              {!isBooksLoading &&
                !booksError &&
                novelBooks.map((book, index) => (
                  <Link
                    href={{
                      pathname: "/detail",
                      query: { id: book.isbn13 || book.id },
                    }}
                    key={book.id}
                    className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 hover:bg-[#f7f7f7]"
                  >
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt={`${book.title} 표지`}
                        className="w-[60px] h-[85px] object-cover border border-gray-200 shrink-0 bg-white"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-[60px] h-[85px] bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 shrink-0 text-center border border-gray-200">
                        표지<br />없음
                      </div>
                    )}

                    <div className="text-left min-w-0 flex flex-col justify-center">
                      <p className="font-bold text-[17px] leading-snug line-clamp-1">
                        {book.title.split(" - ")[0].trim()}
                      </p>
                      <p className="text-[14px] text-gray-500 mt-1 line-clamp-1">
                        {book.author ?? "저자 미상"}
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div
            className="w-10 h-10 bg-[#f7ce7a] rounded-full cursor-pointer"
            title="사용자 정보"
          ></div>
          <div
            className="w-10 h-10 bg-[#f7ce7a] rounded-full cursor-pointer"
            title="설정"
          ></div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex p-8 px-10 gap-8">
        {/* 왼쪽 콘텐츠 영역 */}
        <div className="flex-[3] flex flex-col gap-8">
          <div className="flex gap-5">
            {/* HOT 커뮤니티 */}
            <div className="bg-[#f8e4b7] p-5 rounded-xl flex-1 shadow-sm">
              <h2 className="text-2xl mb-4 flex items-center gap-2.5 font-bold">
                HOT <small className="text-lg font-normal">Community</small>
                <div className="flex gap-2.5 text-sm ml-2">
                  {["소설", "전공", "만화"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => fetchHotCommunity(tab)}
                      className={`px-2 py-1 rounded-md transition ${
                        hotTab === tab
                          ? "bg-[#d89047] text-white font-bold"
                          : "bg-[#e8a867] text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {hotLoading ? (
                  <div className="col-span-3 text-center text-gray-500 py-8">
                    로딩 중...
                  </div>
                ) : hotBooks.length > 0 ? (
                  hotBooks.map((book) => {
                    const mainTitle = book.title.split(" - ")[0].trim();
                    const displayTitle =
                      mainTitle.length > 18
                        ? mainTitle.substring(0, 18) + "..."
                        : mainTitle;

                    return (
                      <Link
                        key={book.id}
                        href={{
                          pathname: "/detail",
                          query: { id: book.isbn13 || book.id },
                        }}
                        className="flex flex-col gap-2 group"
                      >
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={mainTitle}
                            className="w-full aspect-[3/4] object-cover rounded-md border border-gray-300 shadow-md group-hover:shadow-lg transition"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-gray-300 rounded-md border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-bold">
                            표지 없음
                          </div>
                        )}
                        <div className="text-sm font-bold text-gray-900 line-clamp-2">
                          {displayTitle}
                        </div>
                        <div className="text-lg">★★★★☆</div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center text-gray-500 py-8">
                    데이터 없음
                  </div>
                )}
              </div>
            </div>

            {/* NEW 커뮤니티 */}
            <div className="bg-[#f8e4b7] p-5 rounded-xl flex-1 shadow-sm">
              <h2 className="text-2xl mb-4 font-bold flex items-center gap-2.5">
                NEW <small className="text-lg font-normal">Community</small>
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {newLoading ? (
                  <div className="col-span-3 text-center text-gray-500 py-8">
                    로딩 중...
                  </div>
                ) : newBooks.length > 0 ? (
                  newBooks.map((book) => {
                    const mainTitle = book.title.split(" - ")[0].trim();
                    const displayTitle =
                      mainTitle.length > 18
                        ? mainTitle.substring(0, 18) + "..."
                        : mainTitle;

                    return (
                      <Link
                        key={book.id}
                        href={{
                          pathname: "/detail",
                          query: { id: book.isbn13 || book.id },
                        }}
                        className="relative overflow-hidden group"
                      >
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={mainTitle}
                            className="w-full aspect-[3/4] object-cover rounded-md border border-gray-300 shadow-md group-hover:shadow-lg transition"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-gray-300 rounded-md border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-bold">
                            표지 없음
                          </div>
                        )}
                        <div className="absolute top-2 right-[-25px] bg-red-600 text-white text-[11px] px-6 py-0.5 rotate-45 group-hover:-right-[20px] transition-all">
                          NEW!
                        </div>
                        <div className="text-sm font-bold text-gray-900 line-clamp-2 mt-2">
                          {displayTitle}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center text-gray-500 py-8">
                    데이터 없음
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 사이드바 영역 */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-[#f8e4b7] p-8 px-5 rounded-xl text-center shadow-sm">
            <h2 className="mb-5 text-3xl font-bold">로그인</h2>
            {userEmail ? (
              <div>
                <p className="text-sm text-gray-700 mb-2 break-all font-semibold">
                  닉네임
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <p className="text-lg text-[#1f7f95] break-all font-bold">
                    {localStorage.getItem("userNickname") || "닉네임 없음"}
                  </p>
                  <button
                    className="text-lg cursor-pointer hover:scale-110 transition"
                    onClick={() => {
                      setNicknameInput(localStorage.getItem("userNickname") || "");
                      setIsEditingNickname(true);
                      setNicknameModalOpen(true);
                    }}
                    title="닉네임 변경"
                  >
                    ✏️
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-4 break-all">
                  ({userEmail})
                </p>
                <button
                  className="w-full p-2.5 bg-[#d7b267] rounded-3xl text-lg font-bold cursor-pointer mt-2 hover:bg-[#c9a65f] transition"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div>
                <button
                  className="w-full p-2.5 bg-[#333] text-white rounded-3xl text-sm font-bold cursor-pointer mt-2 hover:bg-black transition disabled:opacity-60"
                  onClick={handleGithubLogin}
                  disabled={authLoading}
                >
                  GitHub로 로그인
                </button>
              </div>
            )}
            {authError && (
              <p className="text-xs text-red-600 mt-3 break-words">
                {authError}
              </p>
            )}
          </div>

          <div className="bg-[#f8e4b7] p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-4">즐겨찾기</h2>
            {!userEmail ? (
              <div className="text-center text-[#d32f2f] text-sm mt-8 pb-4 font-bold">
                즐겨찾기를 이용하시려면 로그인 해주세요.
              </div>
            ) : favorites.length > 0 ? (
              favorites.map((book, idx) => {
                const author = book.author ? book.author.split(",")[0] : "저자 미상";
                const mainTitle = book.title.split(" - ")[0].trim();
                
                return (
                  <Link
                    href={{
                      pathname: "/detail",
                      query: { id: book.id },
                    }}
                    key={idx}
                    className="flex items-center justify-between mt-4 group hover:bg-[#ebd7aa] p-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {book.cover ? (
                        <div className="w-[50px] h-[50px] shrink-0 border border-gray-300 rounded-full overflow-hidden shadow-sm">
                          <img
                            src={book.cover}
                            alt={mainTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-[50px] h-[50px] shrink-0 border border-gray-300 rounded-full flex items-center justify-center bg-gray-200 shadow-sm text-lg">
                          📚
                        </div>
                      )}
                      <div className="font-bold leading-tight flex-1 min-w-0">
                        <div className="truncate text-base text-gray-900">{mainTitle}</div>
                        <small className="font-normal text-gray-600 truncate block mt-0.5">
                          {author}
                        </small>
                      </div>
                    </div>
                    <span
                      className="text-red-500 text-2xl ml-2 cursor-pointer transition select-none"
                    >
                      ❤️
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="text-center text-gray-500 text-sm mt-8 pb-4 font-bold">
                즐겨찾기한 도서가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 카테고리 (2열 배치 - 모든 장르) */}
      {[
        ["소설", "만화"],
        ["에세이", "교양"],
        ["참고서", "어학"],
        ["실용", "아동"],
      ].map((genrePair, rowIdx) => (
        <div key={rowIdx} className="mt-8 mb-[50px] px-10 flex gap-8">
          {genrePair.map((genre) => (
            <div key={genre} className="flex-1">
              <div className="flex justify-between items-end mb-2.5">
                <h3 className="text-2xl font-bold">{genre}</h3>
                <div
                  className="text-gray-600 cursor-pointer font-bold text-sm hover:underline"
                  onClick={() => openDetailModal(genre)}
                >
                  자세히 보기 ↗
                </div>
              </div>
              <div className="flex gap-4 bg-[#f8e4b7] p-5 rounded-xl overflow-x-auto shadow-sm">
                {genreLoading[genre] ? (
                  <div className="w-full text-center text-gray-500 py-4">
                    로딩 중...
                  </div>
                ) : genreBooks[genre]?.length > 0 ? (
                  genreBooks[genre].map((book) => {
                    const mainTitle = book.title.split(" - ")[0].trim();
                    const displayTitle =
                      mainTitle.length > 12
                        ? mainTitle.substring(0, 12) + "..."
                        : mainTitle;

                    return (
                      <Link
                        key={book.id}
                        href={{
                          pathname: "/detail",
                          query: { id: book.isbn13 || book.id },
                        }}
                        className="flex flex-col gap-2 w-[120px] shrink-0"
                      >
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={mainTitle}
                            className="w-[120px] h-[180px] object-cover rounded-md border border-gray-300 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all"
                          />
                        ) : (
                          <div className="w-[120px] h-[180px] bg-gray-300 rounded-md border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-bold">
                            표지 없음
                          </div>
                        )}
                        <div className="text-xs font-bold text-gray-900 line-clamp-2">
                          {displayTitle}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="w-full text-center text-gray-500 py-4">
                    데이터 없음
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* 커뮤니티 생성 플로팅 버튼 - 로그인한 사용자만 모달 오픈 허용 */}
      <div
        className="fixed bottom-[30px] right-[30px] w-[60px] h-[60px] bg-[#e5bd6f] rounded-full flex items-center justify-center text-4xl font-bold cursor-pointer shadow-lg hover:bg-[#dab768] hover:scale-105 transition active:scale-95 z-40 text-black/80"
        title="커뮤니티 생성"
        onClick={() => {
          if (!userEmail) {
            alert("로그인 후 이용할 수 있습니다.");
            return;
          }
          const stored = JSON.parse(localStorage.getItem("communities") || "[]");
          setCreatedCommunityIds(stored.map((c: any) => String(c.id)));
          setCreateSearchKeyword("");
          setCreateSearchBooks([]);
          setCreateModalOpen(true);
        }}
      >
        +
      </div>

      {/* 0. 닉네임 설정 모달 */}
      {isNicknameModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setNicknameModalOpen(false)}
        >
          <div
            className="bg-[#fdf5e6] w-[70%] max-w-[500px] h-fit rounded-xl p-10 relative flex flex-col items-center justify-center text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[28px] font-bold mb-6">
              {isEditingNickname ? "닉네임 변경" : "닉네임 설정"}
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              {isEditingNickname
                ? "새로운 닉네임을 입력해 주세요."
                : "GitHub 로그인이 완료되었습니다.\n사용할 닉네임을 입력해 주세요."}
            </p>
            
            <input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nicknameInput}
              onChange={(e) => {
                setNicknameInput(e.target.value);
                handleCheckNickname(e.target.value);
                setAuthError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveNickname();
                }
              }}
              maxLength={20}
              className="w-full p-3 mb-6 border-2 border-black rounded-lg text-center text-lg outline-none focus:border-[#1f7f95] transition"
              autoFocus
            />

            {authError && (
              <p className="text-xs text-red-600 mb-4 break-words">{authError}</p>
            )}

            {isNicknameDuplicate && !authError && (
              <p className="text-xs text-red-600 mb-4 break-words">
                {RESERVED_NICKNAMES.includes(nicknameInput.trim())
                  ? "사용할 수 없는 닉네임입니다."
                  : "사용 중인 닉네임입니다."}
              </p>
            )}

            <div className="flex gap-3 w-full">
              <button
                className="flex-1 p-3 bg-[#e5bd6f] rounded-lg text-lg font-bold cursor-pointer hover:bg-[#d6af62] transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  handleSaveNickname();
                  setIsEditingNickname(false);
                }}
                disabled={isNicknameDuplicate || !nicknameInput.trim()}
              >
                {isEditingNickname ? "변경" : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. 자세히 보기 모달 */}
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailModalOpen(false)}
        >
          <div
            className="bg-[#fdf5e6] w-[80%] max-w-[900px] h-[80%] rounded-xl p-8 relative overflow-y-auto grid grid-cols-6 gap-4 content-start shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 left-4 bg-[#d32f2f] text-white border-none w-9 h-9 text-2xl font-bold rounded cursor-pointer flex items-center justify-center hover:bg-red-700 transition z-10"
              onClick={() => setDetailModalOpen(false)}
            >
              ×
            </button>
            <div className="col-span-full h-8"></div>

            {detailLoading ? (
              <div className="col-span-6 text-center text-gray-600 py-16 text-lg font-semibold">
                로딩 중...
              </div>
            ) : detailBooks.length > 0 ? (
              detailBooks.map((book) => {
                const mainTitle = book.title.split(" - ")[0].trim();
                return (
                  <Link
                    key={book.id}
                    href={{
                      pathname: "/detail",
                      query: { id: book.isbn13 || book.id },
                    }}
                    onClick={() => setDetailModalOpen(false)}
                    className="group"
                  >
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt={mainTitle}
                        className="w-full aspect-[3/4] object-cover rounded-sm border border-gray-300 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-300 rounded-sm border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500 p-2 text-center">
                        표지 없음
                      </div>
                    )}
                  </Link>
                );
              })
            ) : (
              <div className="col-span-6 text-center text-gray-600 py-16 text-lg font-semibold">
                데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. 커뮤니티 개설 모달 */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="bg-[#fdf5e6] w-[70%] max-w-[800px] h-[80%] rounded-xl p-6 md:p-10 relative flex flex-col items-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 left-4 bg-[#d32f2f] text-white border-none w-9 h-9 text-2xl font-bold rounded cursor-pointer flex items-center justify-center hover:bg-red-700 transition"
              onClick={() => setCreateModalOpen(false)}
            >
              ×
            </button>

            <h2 className="text-[28px] md:text-[32px] font-bold mb-6 mt-2">커뮤니티 개설</h2>

            <div className="flex items-center bg-white border-2 border-black rounded-full px-5 py-2 mb-6 w-full max-w-[500px] shadow-sm shrink-0">
              <span className="text-xl px-2">📖</span>
              <input
                type="text"
                placeholder="도서 이름을 입력해 주세요"
                value={createSearchKeyword}
                onChange={(e) => setCreateSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSearch();
                }}
                className="border-none outline-none w-full text-lg px-2 text-center bg-transparent"
              />
              <span
                className="text-xl px-2 cursor-pointer hover:scale-110 transition"
                onClick={handleCreateSearch}
              >
                🔍
              </span>
            </div>

            <div className="flex-1 w-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
              {isCreateSearching ? (
                <div className="flex items-center justify-center h-full text-gray-500 font-semibold">
                  검색 중입니다...
                </div>
              ) : createSearchError ? (
                <div className="flex items-center justify-center h-full text-red-500 font-semibold">
                  {createSearchError}
                </div>
              ) : createSearchBooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full place-items-start">
                  {createSearchBooks.map((book) => {
                    const mainTitle = book.title.split(" - ")[0].trim();
                    const author = book.author ? book.author.split(",")[0] : "저자 미상";

                    return (
                      <div key={book.id} className="flex gap-4 p-2 relative w-full items-start">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={mainTitle}
                            className="w-[90px] h-[130px] object-cover rounded shadow-md shrink-0 border border-gray-100"
                          />
                        ) : (
                          <div className="w-[90px] h-[130px] bg-gray-200 rounded shadow-md shrink-0 flex items-center justify-center text-xs text-gray-500 border border-gray-300">
                            표지 없음
                          </div>
                        )}
                        <div className="flex flex-col flex-1 text-left justify-start pt-2 relative h-full">
                          {/* 개설 로직 - 생성된 커뮤니티일 경우 입장, 아니면 개설 */}
                          {createdCommunityIds.includes(String(book.isbn13 || book.id)) ? (
                            <Link
                              href={{
                                pathname: "/detail",
                                query: { id: book.isbn13 || book.id },
                              }}
                              className="bg-[#2e7d32] text-white text-sm font-bold w-fit px-3 py-1 rounded shadow-sm hover:bg-[#1b5e20] transition mb-2 inline-block text-center whitespace-nowrap"
                            >
                              커뮤니티가 존재합니다
                            </Link>
                          ) : (
                            <Link
                              href={{
                                pathname: "/create",
                                query: { id: book.isbn13 || book.id },
                              }}
                              onClick={(e) => {
                                if (!userEmail) {
                                  e.preventDefault();
                                  alert("로그인 후 이용할 수 있습니다.");
                                  return;
                                }
                                setCreateModalOpen(false);
                              }}
                              className="bg-[#e47648] text-white text-sm font-bold w-fit px-3 py-1 rounded shadow-sm hover:bg-[#d46638] transition mb-2 inline-block text-center"
                            >
                              개설
                            </Link>
                          )}
                          <h3 className="font-bold text-[#333] text-[15px] leading-tight line-clamp-2 mt-1">
                            {mainTitle}
                          </h3>
                          <p className="text-[13px] text-gray-600 mt-1 line-clamp-1 font-medium">
                            저자: {author}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : createSearchKeyword ? (
                <div className="flex items-center justify-center h-full text-gray-500 font-semibold">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="text-[16px] md:text-[18px] text-[#555] leading-loose font-bold h-full flex flex-col justify-center items-center text-center px-4">
                  <p>
                    현재 <span className="text-[#d32f2f]">2026년 3월 18일</span>까지<br className="md:hidden" /> 출판된 도서의 정보가 업데이트 되었습니다.
                  </p>
                  <p className="mt-4">
                    <span className="text-[#d32f2f]">책 한 권 당 하나의 커뮤니티만</span> 개설 가능합니다.
                  </p>
                  <p className="mt-2 text-[14px] font-normal text-gray-500">
                    중복된 커뮤니티를 발견하셨다면 010-xxxx-xxxx로 연락 바랍니다.
                  </p>
                  <p className="mt-6">
                    <span className="text-[#d32f2f]">커뮤니티 생성 시 2포인트</span>를 얻을 수 있습니다.
                    <span className="text-sm font-normal text-gray-500 block mt-1">(하루에 3번 제한)</span>
                  </p>
                </div>
              )}
            </div>
            
            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1; 
                border-radius: 10px;
                margin: 10px 0;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #888; 
                border-radius: 10px;
                border: 2px solid #f1f1f1;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #555; 
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
