# 동현디™: 출처·이용 안내

동현디는 비상업적 교육용 취미 작품이다. 1형 당뇨병 교육 게임 「[Level One: A Diabetes Game](https://playlevelone.com/)」의 게임 방식을 가져와, [동현스](https://github.com/Raspberry-Kim/donghyun-lab21)의 연필 틀 위에 새로 지었다. 아이디어를 제안한 부산대학교 의과대학 유석동 교수께 감사드린다. 치료 도구가 아니다.

## Level One: A Diabetes Game에서 가져온 것

- 게임 방식: 음식이 벨트를 타고 오고, 인슐린 버튼으로 용량을 정해 맞고, 낮으면 주스를 마시고, 몸속의 포도당과 인슐린을 입자로 보여 주며, 스테이지마다 별 셋까지 받는 방식.
- 원작의 공개 설명([기능 소개](https://playlevelone.com/features/), [개발 블로그](https://playlevelone.com/2024/04/10/game-design-document/), [자주 묻는 질문](https://playlevelone.com/faq/))과 스토어 화면([App Store](https://apps.apple.com/us/app/level-one-a-diabetes-game/id6739605694), [Google Play](https://play.google.com/store/apps/details?id=com.medlevelex.diabetes&hl=en_US))을 읽고 옮겼다.
- 원작의 그래픽, 음악·효과음, 글, 스테이지 자료, 코드는 쓰지 않았다.
- Level One: A Diabetes Game은 Level Ex(지금의 Relevate Health Games)가 만들었다. 동현디는 이들과 관계가 없고, 승인이나 후원을 받지 않았다. 이름과 상표는 각 권리자의 것이다.

## 원작과 다른 점

- 혈당 단위는 mg/dL이다.
- 인슐린 용량은 버튼을 누르고 있는 동안 오르는 방식 대신, 버튼을 누르면 열리는 눈금 판에서 0.5단위 눈금을 정해 맞는다. 판이 열린 동안에도 시간은 흐른다.
- 판을 브라우저 칸과 `.dhsave` 파일로 저장하고 불러온다.
- 스테이지는 열둘이고, 음식은 대한당뇨병학회 식품교환표의 1교환 단위로 골랐다.
- 튜토리얼은 게임 안에 두지 않고 페이지의 게임 소개 탭에 글로 적었다.
- 시작 스테이지와 종이 색은 동현랭으로 정한다.
- 화면은 연필 선으로 그린 세로 240×420칸이다.

## 동현스에서 가져온 것

- 연필 선과 종이(`src/sketch.js`)는 동현스의 연필 엔진이다.
- 페이지의 틀, 종이를 넘기는 스테이지 전환, 출전과 메뉴(`src/app.js`), 꽃비(`src/petals.js`)는 동현스의 것을 동현디에 맞게 고쳐 썼다.

## 동현디가 새로 만든 것

- 게임 엔진(`src/game.js`): 혈당·인슐린·음식·케톤·운동·아픈 날의 셈, 별과 되짚기.
- 스테이지 열두 장과 음식 열 가지(`src/stages.js`), 그림 서른한 가지(`src/art.js`), 화면(`src/render.js`), 입력(`src/input.js`), 효과음(`src/sfx.js`), 동현랭 출전 규약과 예제(`src/examples.js`), 문서, 시험.
- 그림 파일은 출전 준비 화면의 제목 한 장(`src/title.png`)이다. 그 밖의 음식, 세포, 열쇠, 얼굴, 버튼, 그래프, 종이의 결은 쪽이 열릴 때 코드가 연필 선을 그어 만든다.
- 동현랭 실행기(`src/donghyun.js`)는 [동현랭 저장소](https://github.com/Raspberry-Kim/donghyun-lang)의 v1.55를 고치지 않고 썼다.

## 의학 근거

- 혈당 목표와 범위 안 시간: [ISPAD Clinical Practice Consensus Guidelines 2024: Glycemic Targets](http://www.ncbi.nlm.nih.gov/pmc/articles/PMC11854972).
- 저혈당: [ISPAD Clinical Practice Consensus Guidelines 2022: Hypoglycemia](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10107518/), [American Diabetes Association 저혈당 안내](https://professional.diabetes.org/sites/dpro/files/2026-04/whattoknowwithalow-patient-4-26.pdf).
- 인슐린 치료: [ISPAD Clinical Practice Consensus Guidelines 2024: Insulin Treatment](https://www.ispad.org/static/3b8e00b2-9f33-43a5-a84f9eda1accef64/ICPCG-Chapter-9-2024.pdf).
- 아픈 날과 케톤: [ISPAD Clinical Practice Consensus Guidelines 2022: Sick Day Management](https://www.ispad.org/static/6551d05a-156c-4772-a32a6d663fcfc2d4/2022CGCh13PediatricDiabetes-2.pdf).
- 운동: [ISPAD Clinical Practice Consensus Guidelines 2022: Exercise](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10107219/).
- 음식의 탄수화물: [대한당뇨병학회 식품교환표](https://diabetes.or.kr/general/dietary/dietary_03.php).
- 인슐린과 음식이 시간에 따라 퍼지는 모양, 운동·아픈 날·케톤의 크기, 다시 해야 하는 기준과 별의 기준은 지침의 값이 아니라 게임을 위해 정한 가정이다. `README.md`의 ‘근거와 가정’에 적었다.

## 승리 팡파르와 꽃비

- 열두 스테이지를 마친 화면에서 팡파르가 울리고 꽃비가 내린다. 동현삼·동현항·동현스의 승리 연출을 옮긴 것이다.
- 선율은 에드워드 엘가의 「위풍당당 행진곡」 1번(Op. 39 No. 1, 1901년 작곡·출판)의 트리오 첫 줄이다. 악보는 공공 영역이다([IMSLP의 작품 면](https://imslp.org/wiki/Pomp_and_Circumstance_March_No.1,_Op.39_No.1_(Elgar,_Edward))).
- 녹음이나 연주 음원을 쓰지 않았다. 음높이와 박자를 `src/sfx.js`에 적고 브라우저에서 합성한다.
- 꽃비(`src/petals.js`)는 그림 파일 없이 작은 픽셀 무늬를 캔버스에 찍는다.

## 포동이

머리글의 포동이는 동현 시리즈의 말티즈다. 포동이의 이름과 모습에 대한 권리는 MIT 코드 라이선스와 별개로 만든 사람에게 있다. 코드를 가져다 쓸 때 이 그림과 이름은 바꿔 쓰기를 권한다.

## 글꼴

검은고딕 Black Han Sans · Pretendard · 나눔고딕코딩 · 개구 Gaegu — SIL Open Font License 1.1 (`licenses/`). 게임 화면의 글은 손글씨 글꼴 Gaegu에서 쓰는 글자만 추려 담았다. 출전 준비 화면의 제목 ‘동현디’는 글꼴이 아니라 제작자 본인이 직접 쓴 글씨이고, 이 글씨의 권리는 MIT와 별개로 쓴 사람에게 있다.

## 라이선스

동현디 코드·문서: MIT (`LICENSE`). 출전 준비 화면의 제목 글씨(`src/title.png`)는 여기에 들지 않는다. 동현랭 실행기: MIT (`licenses/DONGHYUN-MIT.txt`).
