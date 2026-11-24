# DEARCUS 프로모션 스튜디오 (시제품)

정적 사이트입니다. 빌드 과정이 없고, 이 폴더를 그대로 올리면 됩니다.

- `index.html` : 화면과 편집 엔진 전체
- `scene.js` : 블프 PSD에서 변환한 제작물 데이터(상세 6, 배너 4, 썸네일 29)
- `fonts/` : Pretendard, G마켓 산스 Bold
- `*.webp` : 제작물에 쓰이는 이미지

Utile Display는 Adobe Fonts(use.typekit.net/did8moq.css)에서 불러옵니다.
Adobe Fonts 웹 프로젝트 "claude"의 도메인 목록에 배포 주소를 등록해야 적용됩니다.

Vercel 설정: Framework Preset = Other, Build Command 비움, Output Directory 비움.
