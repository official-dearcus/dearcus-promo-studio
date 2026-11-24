# DEARCUS 프로모션 스튜디오

정적 사이트입니다. 빌드 과정이 없고, 이 폴더의 파일을 그대로 올리면 됩니다.

- `index.html` : 화면 전체(행사 설정 → 검수와 수정 → 출력)
- `convert.js` : 올린 PSD를 브라우저 안에서 읽어 편집 가능한 제작물로 바꾸는 부분
- `agpsd.js` : PSD 읽기 라이브러리(ag-psd, MIT)
- `fonts/` : Pretendard, G마켓 산스 Bold (Utile Display는 Adobe Fonts에서 불러옴)
- `scene.js`, `*.webp` : "예시 불러오기"에서만 쓰는 11월 블랙프라이데이 예시 데이터

Vercel 설정: Framework Preset = Other, Build Command / Output Directory 비움.
