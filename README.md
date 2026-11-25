# DEARCUS 프로모션 스튜디오

정적 사이트입니다. 빌드 과정이 없고, 이 폴더의 파일을 그대로 올리면 됩니다.

- `index.html` : 화면 전체(행사 설정 → 검수와 수정 → 출력)
- `convert.js` : 올린 PSD를 브라우저 안에서 읽어 편집 가능한 제작물로 변환
- `gen.js` : 기획안 엑셀을 읽어 쿠폰·옵션 카드·썸네일을 자동 생성
- `agpsd.js`(ag-psd, MIT), `xlsx.js`(SheetJS, Apache-2.0) : PSD·엑셀 읽기 라이브러리
- `fonts/` : Pretendard, G마켓 산스 Bold (Utile Display는 Adobe Fonts에서 불러옴)
- `scene.js`, `*.webp` : 기본 틀(블프 디자인)과 상품 이미지·연출컷. PSD에 옵션 카드 틀이 없을 때와 "예시 불러오기"에서 사용

Vercel 설정: Framework Preset = Other, Build Command / Output Directory 비움.
