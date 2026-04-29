import type { DepartureMessageType, Language } from "../types.js";

type ArrivalTemplate = (name: string, room: string, date: string) => string;
type DepartureTemplate = (name: string, room: string) => string;

export const MESSAGE_TEMPLATES: {
  arrival: Record<Language, ArrivalTemplate>;
} & Record<DepartureMessageType, Record<Language, DepartureTemplate>> = {
  arrival: {
    KO: (name, room, date) =>
      `${name} 님, UH Suite The COEX를 찾아주셔서 감사합니다.

고객님께서 배정받으신 객실은 ${room}이며,
1층 출입구의 비밀번호 입력 가이드 영상과 함께 안내드립니다.

🏨 호텔 부대시설 안내
B동 지하1층의 Bar OHU, 
A동 지하1층의 Stonehouse(헤드스파), 
A동 2층의 메디컬블룸(피부 클리닉)이 있습니다. 

예약이나 안내가 필요하실경우 프론트에 문의해주세요 !

⏰ 체크아웃 안내
체크아웃 시간은 ${date} 오전 11시이며,
레이트 체크아웃은 최대 1시간(오후 12시까지) 가능하고,
이용을 원하실 경우 체크아웃 하루 전까지 요청 부탁드립니다.
(추가 비용 20,000원)

공항밴서비스(유료) 또한 배정 가능하므로, 필요하실경우 프론트에 문의 부탁드립니다.

🧹 객실 청소 안내
하우스키핑 서비스는 매일 수건 교체, 생수 보충, 쓰레기통 교체가 기본 제공되며,
침구류 교체 및 객실 전체 청소는 4일에 한 번 진행됩니다.

(자원재활용법 시행에 따라 일회용 칫솔 및 치약은 무상 제공되지 않습니다. 
필요하신 경우 칫솔 2개와 치약 1개로 구성된 덴탈 세트를 프런트에서 6,500원에 구매하실 수 있습니다.)

하우스키핑을 거부하신 뒤,
추후 재방문 요청 시간을 말씀해주시지 않을 경우
해당 일자의 하우스키핑이 취소될 수 있는 점 양해 부탁드립니다.

🧺 세탁 서비스 안내
세탁물 서비스는 하루 1회 이용 가능하며,
세탁물은 직접 포장하여 프론트에 전달해 주시면
세탁 및 건조 후 객실로 전달됩니다.
(해당 서비스는 무료이며, 대량 세탁물은 설비 용량 문제로 제한될 수 있습니다. / 체크아웃 하루 전의 오후 6시 이후로는 세탁물 서비스 이용이 불가합니다.)

📺 OTT 서비스 안내
호텔 내 OTT 계정은 제공되지 않으며, 개인 계정 이용시 반드시 로그아웃 후 퇴실 부탁드립니다

세부 안내사항이 필요하실 경우 객실 내 배치된 안내문을 참고 가능하며,
도움이 필요하시면 언제든지 연락 주십시오.
편안한 숙박 되시길 바랍니다. 감사합니다.

UH Suite The COEX`,
    EN: (name, room, date) =>
      `Dear ${name},
Thank you for choosing UH Suite The COEX.

Your assigned room is ${room}, 
We are also sharing a guide video for entering the password at the 1st floor entrance,
along with other important check-in information.

If you need more detailed information, please refer to the guide placed in the room.

🏨Hotel Facilities

Bar OHU: Building B, B1
Stonehouse (Head Spa): Building A, B1
Medical Bloom (Skin Care Clinic): Building A, 2F

If you would like to make a reservation or need further assistance, please contact the front desk!

⏰ Check-out Information
The standard check-out time is 11:00 AM on ${date}.  
Late check-out is available for up to 1 hour (until 12:00 PM).  
If you wish to request a late check-out, please inform us one day in advance.  
(Additional fee: 20,000 KRW)

Airport van service (paid) is also available upon request.
If you need this service, please contact the front desk.

🧹 Housekeeping Service
Housekeeping provides daily towel replacement, bottled water refill, and trash bin replacement.  
Linen change and full room cleaning are provided every 4 days.

(In accordance with the Act on the Promotion of Saving and Recycling of Resources, complimentary disposable toothbrushes and toothpaste are not provided. 
If needed, a dental kit (2 toothbrushes and 1 toothpaste) is available for purchase at the front desk for 6,500 KRW.)

If you decline housekeeping and do not later request a new time for our staff to visit,  
please note that housekeeping for that day may be cancelled.

🧺 Laundry Service
Laundry service is available once per day.  
Please pack your laundry and deliver it to the front desk.  
Your laundry will be washed, dried, and returned to your room.  
(This service is provided free of charge. Due to equipment capacity limitations, large volumes of laundry may be restricted. Laundry service is unavailable after 6:00 PM on the day before check-out.)

📺 OTT Service Information
We do not provide OTT accounts in the hotel.
If you use your personal account, please make sure to log out before check-out.

If you require any assistance, please feel free to contact us at any time.
We wish you a pleasant and comfortable stay. Thank you.

UH Suite The COEX`,

    JP: (name, room, date) =>
      `${name} 様  
UH Suite The COEX をご利用いただき、誠にありがとうございます。

ご案内のお部屋は ${room} でございます。  
併せて、1階入口の暗証番号入力ガイド動画とご滞在に関するご案内をお送りいたします。

🏨 館内施設のご案内

Bar OHU： B棟 地下1階
Stonehouse（ヘッドスパ）： A棟 地下1階
Medical Bloom（スキンクリニック）： A棟 2階

ご予約や詳細については、フロントまでお気軽にお問い合わせください！

⏰ チェックアウトのご案内
チェックアウトは ${date} 午前11時 でございます。  
レイトチェックアウトは最大1時間（正午12時まで）承っております。  
ご希望の際は前日までにお申し付けください。  
（追加料金：20,000ウォン）

空港バンサービス（有料）もご利用可能です。
ご希望の際はフロントデスクまでお問い合わせください。

🧹 客室清掃のご案内
ハウスキーピングでは、毎日タオル交換・ミネラルウォーターの補充・ゴミ箱の交換を行っております。  
リネン交換および客室全体のクリーニングは4日に1回実施いたします。

(資源リサイクル法の施行に伴い、使い捨ての歯ブラシおよび歯磨き粉の無償提供は行っておりません。 
ご入用のお客様は、フロントにてデンタルセット（歯ブラシ2本・歯磨き粉1個入）を6,500ウォンでご購入いただけます。)

ハウスキーピングをお断りになった後、  
その日の再訪問時間について追加のご要望をいただけない場合、  
当日のハウスキーピングはキャンセルとなる場合がございますので、あらかじめご了承ください。

🧺 ランドリーサービスのご案内
ランドリーサービスは1日1回ご利用いただけます。  
お手数ですが、衣類はお客様ご自身で袋に入れ、フロントまでお持ちください。  
洗濯・乾燥後、お部屋までお届けいたします。  
（本サービスは無料でご利用いただけますが、設備容量の都合により大量の洗濯物はお受けできない場合がございます。チェックアウト前日の午後6時以降は、ランドリーサービスをご利用いただけません。）

📺 OTTサービスのご案内
当ホテルでは OTT アカウントの提供は行っておりません。
個人アカウントをご利用の場合は、必ずチェックアウト前にログアウトをお願いいたします。

詳しいご案内が必要な場合は、客室内に設置されている案内文をご参照ください。
ご不明点やお手伝いが必要な際は、いつでもご連絡ください。
快適にお過ごしいただけますよう心よりお祈り申し上げます。ありがとうございます。

UH Suite The COEX`,
    CN: (name, room, date) =>
      `尊敬的 ${name}，欢迎入住 UH Suite The COEX。

您被分配的客房为 ${room}，
现向您提供一楼入口密码输入指南视频以及相关入住说明。

🏨 酒店附属设施指南
Bar OHU: B栋 地下1层 
Stonehouse (头疗SPA): A栋 地下1层
Medical Bloom (皮肤管理中心): A栋 2层

如需预约或咨询，请联系前台。

🚭 禁烟须知（重要）
客房内禁止吸烟。
由于本建筑为无烟建筑，根据大韩民国《国民健康增进法》，在客房内吸烟属于法律所禁止的行为。
另外，如因在客房内吸烟导致墙纸等设施需要重新整修，将产生 30 万韩元的费用，并可能向吸烟的客人收取。

⏰ 退房时间说明
标准退房时间为 ${date} 上午 11 点。  
如需延迟退房，可延长最多 1 小时（至中午 12 点）。  
如需使用延迟退房服务，请于退房日期前一天提前告知前台。  
（需额外支付 20,000 韩元）

可提供付费机场接送服务。
如有需要，请联系前台咨询。

🧹 客房清洁说明
客房清洁每日提供更换毛巾、补充瓶装水及更换垃圾桶。  
床品更换及客房全面清洁每 4 天进行一次。

(根据《资源节约与循环利用法》，本酒店不免费提供一次性牙刷和牙膏。 
如有需要，您可以在前台购买牙具套装（内含2把牙刷和1支牙膏），售价为 6,500韩元。)

若您选择拒绝当天的客房清洁，且之后未告知重新安排清洁时间，  
当日客房清洁服务可能会被取消，敬请谅解。

🧺 洗衣服务说明
洗衣服务每日可使用一次。  
请将衣物自行打包后交至前台，洗涤及烘干完成后将送回客房。  
（本服务免费提供，但由于设备容量限制，大量洗衣物可能会受到限制。退房前一天晚上6点以后将无法使用洗衣服务。）

📺 OTT 服务说明
酒店不提供任何 OTT 账户。
如使用个人账户，请务必在退房前登出。

如需更详细的说明，请参考客房内提供的指南。
若您需要任何协助，欢迎随时与我们联系。
祝您入住愉快，感谢您的光临。

UH Suite The COEX`,
  },
  BEFORE_30: {
    KO: (name, room) =>
      `${name} 님, 좋은 아침입니다.

고객님께서 이용 중이신 객실 ${room}은
오늘 오전 11시 체크아웃 예정입니다.

오전 10시 30분 기준 안내 드리오니,
퇴실 준비에 참고 부탁드립니다.

레이트 체크아웃(최대 오후 12시)은 
가능 여부 확인이 필요하기 때문에
희망 시 프론트에 문의 부탁드립니다.
(추가요금 20,000원)

UH Suite The COEX`,
    EN: (name, room) =>
      `Good morning, ${name}.

This is a friendly reminder that the check-out time 
for ${room} is 11:00 AM today.

As of 10:30 AM, please kindly prepare for check-out.

Late check-out (until 12:00 PM) is subject to availability,
and an additional fee of 20,000 KRW applies.

UH Suite The COEX`,
    JP: (name, room) =>
      `${name} 様、おはようございます。

ご利用中の ${room} は、
本日午前11時チェックアウト予定でございます。

現在10時30分時点でのご案内となりますので、
ご退室準備をお願いいたします。

レイトチェックアウト（正午12時まで）は
空室状況により承れない場合がございます。
追加料金20,000ウォンにて承ります。

UH Suite The COEX`,
    CN: (name, room) =>
      `${name} 您好，早安。

在 UH Suite The COEX 度过的时光还令您满意吗？ 
提醒您，您所入住的 ${room} 号房退房时间为 上午 11:00。

现在是上午 10:30，为了让您的离店过程更加从容，建议您现在可以开始稍作整理，并检查是否有遗落的随身物品。

延迟退房须知： 视当日房态而定，您可以申请延迟退房至中午 12:00（将产生 20,000 韩元的额外费用）。如有需要，请随时联系前台为您确认。

感谢您选择 UH Suite The COEX，祝您接下来的行程愉快。`,
  },
  AFTER_15: {
    KO: (name, room) =>
      `${name} 님, 안녕하세요.

고객님께서 이용 중이신 객실 ${room}은
오늘 오전 11시 체크아웃 예정입니다.

현재 시각 11시 15분 기준으로 확인드리오니
가능하실 때 프론트로 체크아웃 부탁드립니다.

레이트 체크아웃(최대 12시)은
사전 요청 및 추가 비용(20,000원)이 발생합니다.

UH Suite The COEX`,
    EN: (name, room) =>
      `Hello ${name}.

We would like to remind you that the standard check-out time 
for ${room} was 11:00 AM.

It is now 11:15 AM.
When you are ready, please kindly proceed to check-out.

Late check-out (until 12:00 PM) is subject to request and an additional fee of 20,000 KRW.

UH Suite The COEX`,
    JP: (name, room) =>
      `${name} 様、こんにちは。

ご利用中の ${room} の
通常チェックアウト時間は午前11時でございます。

現在11時15分でございますので、
ご都合のよい時間にチェックアウトをお願いいたします。

レイトチェックアウト（正午12時まで）は
事前申請と追加料金（20,000ウォン）が必要です。

UH Suite The COEX`,
    CN: (name, room) =>
      `${name} 您好。

希望您在 UH Suite The COEX 度过了一个愉快的夜晚。

在此温馨提醒，您入住的 ${room} 号房标准退房时间为 上午 11:00。

由于现在已过退房时间（11:15），为了不影响后续的客房清洁安排，还请您在方便时尽快前往前台办理退房手续。

关于延迟退房： 若您需要延迟退房至中午 12:00，请务必提前与前台确认（此服务需视当日房态而定，并加收 20,000 韩元费用）。

感谢您的配合与理解。
如有任何疑问，请随时联系我们。`,
  },
  LATE_12: {
    KO: (name, room) =>
      `${name}님께,

저희와 함께해주셔서 감사합니다.

안내드린 12시까지의 레이트 체크아웃 시간이 경과하여 알려드립니다.
다음 투숙객을 위해 객실 정비가 필요하오니, 
객실 정비를 위하여 체크아웃을 진행해 주시길 부탁드립니다.

출발 준비에 도움이 필요하시면 언제든지 프런트 데스크로 연락해 주세요.

협조해 주셔서 감사합니다.

UH Suite The COEX`,
    EN: (name, room) =>
      `Dear ${name}, 

We hope you have enjoyed your stay with us. 
This is a gentle reminder that your extended check-out time of 12:00 PM has now passed. 

We kindly ask that you proceed with check-out so we can prepare the room for the next guest. 

If you need any assistance with your departure, please contact the front desk immediately. 

Thank you for your cooperation.

UH Suite The COEX`,
    JP: (name, room) =>
      `${name}様

当ホテルで快適にお過ごしいただけましたでしょうか。

ご案内しておりましたレイトチェックアウトの時間（12:00）が過ぎましたのでお知らせいたします。
次のお客様のご準備のため、チェックアウトをお願い申し上げます。

ご出発に際し、お手伝いが必要な場合はフロントデスクまでお問い合わせください。

ご協力いただき、誠にありがとうございます。

UH Suite The COEX`,
    CN: (name, room) =>
      `尊敬的 ${name}，

希望您此次入住愉快。

提醒您，您延迟退房的时间（12:00 PM）已过。
为便于我们为下一位客人做好客房准备，敬请您配合办理退房。

如需任何离店协助，请立即联系前台。

感谢您的理解与配合。

UH Suite The COEX`,
  },
};
