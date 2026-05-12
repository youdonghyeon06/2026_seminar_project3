"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CreateCommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [creator, setCreator] = useState("");
  const [manager, setManager] = useState("");
  const [description, setDescription] = useState("");
  const [creationDate, setCreationDate] = useState("");

  useEffect(() => {
    // 1. 개설일 (오늘 날짜)
    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    setCreationDate(formattedDate);

    // 2. 개설자/매니저 초기값 (현재 닉네임)
    const defaultNickname = localStorage.getItem("userNickname") || "익명사용자";
    setCreator(defaultNickname);
    setManager(defaultNickname);

    if (id) {
      fetch(`/api/aladin/search?q=${id}`)
        .then(res => res.json())
        .then(data => {
          const item = data.item?.[0];
          if (item) {
            setBook(item);
            // 3. 기본 책 설명 자동 채우기
            const cleanDesc = (item.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            setDescription(cleanDesc || `${item.title.split(" - ")[0]}에 대해 이야기하는 커뮤니티입니다.`);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator.trim() || !manager.trim() || !description.trim()) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    
    // 로컬 스토리지에 커뮤니티 정보 저장 (DB 연동 시 이 부분을 Supabase insert로 변경)
    const newCommunity = {
      id: id || "",
      creator,
      manager,
      date: creationDate,
      desc: description,
    };
    
    const existing = JSON.parse(localStorage.getItem("communities") || "[]");
    const updated = existing.filter((c: any) => c.id !== newCommunity.id); // 기존 혹시 있으면 덮어쓰기 방지나 업데이트
    updated.push(newCommunity);
    localStorage.setItem("communities", JSON.stringify(updated));

    // 개설 완료 시 디테일 페이지로 정보 전달
    const queryParams = new URLSearchParams({
      id: id || "",
      creator: creator,
      manager: manager,
      date: creationDate,
      desc: description
    }).toString();

    router.push(`/detail?${queryParams}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f4ede1] flex items-center justify-center font-bold text-xl">로딩중...</div>;
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#f4ede1] flex items-center justify-center flex-col gap-4">
        <h1 className="font-bold text-2xl">도서 정보를 찾을 수 없습니다.</h1>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-300 rounded font-bold hover:bg-gray-400">뒤로가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfaf0] text-[#333] font-sans pb-20">
      <header className="flex items-center justify-between px-10 py-4 bg-[#f4ebd0] border-b-2 border-[#e0d5b5]">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-2xl text-[#008080] hover:opacity-80 transition cursor-pointer decoration-transparent">
          <img src="/main_logo.png" alt="북커넥트 로고" className="w-12 h-12 object-contain" />
          <div className="leading-tight">
            BOOKCONNECT<br />
            <span className="text-sm font-normal text-[#555]">북커넥트</span>
          </div>
        </Link>
      </header>

      <main className="max-w-[700px] mx-auto p-5 mt-10">
        <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="text-3xl font-extrabold mb-8 text-center border-b pb-4">새 커뮤니티 개설</h2>
          
          <div className="flex gap-6 mb-8 bg-[#f9f7f1] p-4 rounded-xl">
            {book.cover ? (
              <img src={book.cover} alt="표지" className="w-[100px] h-[145px] object-cover rounded shadow border" />
            ) : (
              <div className="w-[100px] h-[145px] bg-gray-200 rounded flex items-center justify-center text-xs">표지 없음</div>
            )}
            <div className="flex flex-col justify-center">
              <span className="text-sm font-bold text-[#e47648] mb-1">대상 도서</span>
              <h3 className="text-xl font-bold text-gray-900">{book.title.split(' - ')[0]}</h3>
              <p className="text-sm text-gray-600 mt-1">저자: {book.author?.split(',')[0] || "미상"} | 출판사: {book.publisher}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">개설일</label>
              <input type="text" value={creationDate} readOnly className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 font-medium cursor-not-allowed outline-none" />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">최초 개설자</label>
                <input type="text" value={creator} onChange={(e) => setCreator(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#d4bc7c] outline-none transition" placeholder="개설자 이름" required />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">커뮤니티 매니저</label>
                <input type="text" value={manager} onChange={(e) => setManager(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#d4bc7c] outline-none transition" placeholder="매니저 이름" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">커뮤니티 설명 <span className="text-xs text-[#e47648] font-normal ml-1">(자유롭게 수정 가능합니다)</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full p-3 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#d4bc7c] outline-none transition resize-none text-[15px] leading-relaxed" required />
            </div>

            <div className="flex gap-4 mt-6">
              <button type="button" onClick={() => router.back()} className="flex-1 p-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition">취소</button>
              <button type="submit" className="flex-[2] p-4 bg-[#e47648] text-white font-bold rounded-xl hover:bg-[#d46638] transition shadow-md">개설 완료</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function CreateCommunity() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4ede1] flex items-center justify-center font-bold text-xl">로딩중...</div>}>
      <CreateCommunityContent />
    </Suspense>
  );
}