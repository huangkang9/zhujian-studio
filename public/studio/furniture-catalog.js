/** Default dimensions in mm. Shapes are procedural, no branded model assets. */
const item=(name,category,shape,w,d,h,color,material='wood',extra={})=>({name,category,shape,w,d,h,color,material,...extra});
export const furnitureCategories=['全部','客厅','卧室','餐厅','书房','收纳','厨房','卫浴','灯饰','软装','家电','休闲'];
export const materialNames={fabric:'织物',leather:'皮革',wood:'木纹',lacquer:'哑光烤漆',metal:'金属',stone:'石材'};
export const furnitureTypes={
 crib:item('婴儿床','卧室','crib',1250,700,950,'#d5bc94'),
 beanbag:item('懒人沙发','客厅','beanbag',850,850,750,'#c9b191','fabric'),
 windowCushion:item('飘窗坐垫','软装','cushion',1600,600,150,'#d6c8b5','fabric',{elevation:450}),
 counter:item('独立地柜台面','厨房','counter',1200,600,850,'#c9c8bc','lacquer'),
 wallCabinet:item('厨房吊柜','厨房','cabinet',900,350,700,'#d8d3c5','lacquer',{elevation:1500}),
 stove:item('独立双灶','厨房','stove',750,450,100,'#394643','metal',{elevation:850}),
 sink:item('独立双槽水槽','厨房','sink',800,450,240,'#bcc4bc','metal',{elevation:650}),
 hood:item('抽油烟机','家电','hood',900,500,650,'#aeb9b6','metal',{elevation:1550}),
 dishwasher:item('洗碗机','家电','dishwasher',600,600,820,'#bbc4c0','metal'),
 dryer:item('烘干机','家电','dryer',600,620,850,'#e4e3db','lacquer'),
 aircon:item('立式空调','家电','aircon',480,380,1800,'#e0e2d8','lacquer'),
 wallAircon:item('壁挂空调','家电','wallaircon',900,240,320,'#e5e5db','lacquer',{elevation:2100}),
 waterHeater:item('电热水器','家电','waterheater',800,440,440,'#e5e2d8','lacquer',{elevation:1850}),
 purifier:item('空气净化器','家电','purifier',400,320,650,'#dcded3','lacquer'),
 microwave:item('微波炉','家电','microwave',520,420,310,'#b9c2bc','metal',{elevation:900}),
 tallOven:item('蒸烤箱高柜','厨房','talloven',600,600,2100,'#c9b79c'),
 piano:item('立式钢琴','休闲','piano',1500,600,1200,'#3f4742','lacquer'),
 treadmill:item('跑步机','休闲','treadmill',800,1800,1400,'#55615a','metal'),
 bench:item('换鞋长凳','收纳','bench',1000,380,450,'#bfa588','fabric'),
 doubleVanity:item('双盆浴室柜','卫浴','doublevanity',1500,550,850,'#b7bda9','lacquer'),
 sofa:item('三人沙发','客厅','sofa',2200,900,820,'#b4bdaa','fabric'),
 loveseat:item('双人沙发','客厅','sofa',1600,850,820,'#c0a68c','fabric'),
 sectional:item('转角沙发','客厅','sectional',2900,1700,820,'#b9b6aa','fabric'),
 armchair:item('休闲单椅','客厅','armchair',800,820,860,'#b88969','leather'),
 ottoman:item('软包脚凳','客厅','ottoman',650,500,410,'#c4b89b','fabric'),
 coffee:item('长方茶几','客厅','coffee',1100,600,420,'#b9956e'),
 roundCoffee:item('圆形边几','客厅','roundtable',550,550,510,'#c5ac86'),
 tvstand:item('电视柜','客厅','lowcabinet',2000,420,520,'#a98967'),
 television:item('平板电视','客厅','television',1450,260,900,'#303b3b','metal'),
 bed:item('双人床','卧室','bed',1800,2100,1000,'#d6c7ad','fabric'),
 singleBed:item('单人床','卧室','bed',1200,2000,950,'#bdc4b3','fabric'),
 nightstand:item('床头柜','卧室','drawers',500,420,520,'#b89b78'),
 dresser:item('梳妆台','卧室','dresser',1000,450,1400,'#d2bda2'),
 table:item('餐桌','餐厅','table',1400,800,750,'#bd9c74'),
 roundDining:item('圆餐桌','餐厅','roundtable',1200,1200,750,'#b29b7e'),
 chair:item('餐椅','餐厅','chair',460,500,820,'#8d9c8c'),
 barstool:item('吧台高脚椅','餐厅','stool',420,420,750,'#a98262'),
 sideboard:item('餐边柜','餐厅','drawers',1500,420,900,'#b9a084'),
 desk:item('书桌','书房','desk',1400,650,750,'#c3a17b'),
 officeChair:item('办公椅','书房','officechair',650,650,1100,'#555e57','fabric'),
 bookcase:item('开放书架','书房','bookcase',1000,350,2000,'#c3ab8c'),
 cabinet:item('衣柜','收纳','cabinet',1800,600,2300,'#cbbfa9','lacquer'),
 shoeCabinet:item('玄关鞋柜','收纳','cabinet',1000,350,1100,'#cab49a'),
 drawers:item('五斗柜','收纳','drawers',800,450,1050,'#baa17f'),
 kitchen:item('水槽灶台地柜','厨房','kitchen',2400,600,850,'#c6ccc0','lacquer'),
 island:item('厨房中岛','厨房','island',1600,900,900,'#c4b397','stone'),
 fridge:item('双门冰箱','厨房','fridge',800,720,1800,'#bcc4c1','metal'),
 oven:item('嵌入式烤箱柜','厨房','oven',600,600,850,'#b0b6ae','metal'),
 tub:item('浴缸','卫浴','tub',1700,750,600,'#e8e8dd','stone'),
 toilet:item('马桶','卫浴','toilet',400,700,780,'#f0efdf','lacquer'),
 vanity:item('浴室洗手台','卫浴','vanity',900,500,850,'#b1baa9','lacquer'),
 washer:item('滚筒洗衣机','卫浴','washer',600,620,850,'#dddeda','lacquer'),
 shower:item('淋浴隔断','卫浴','shower',900,900,2100,'#82948e','metal'),
 floorLamp:item('落地灯','灯饰','floorlamp',420,420,1600,'#d4c7ad','fabric'),
 tableLamp:item('台灯','灯饰','tablelamp',320,320,470,'#d1b890','fabric',{elevation:520}),
 pendant:item('吊灯','灯饰','pendant',600,600,650,'#e0cfab','fabric',{elevation:2000}),
 plant:item('落地绿植','软装','plant',450,450,1100,'#829b76','lacquer'),
 rug:item('地毯','软装','rug',2400,1800,15,'#d3c6ad','fabric'),
 mirror:item('落地穿衣镜','软装','mirror',650,100,1750,'#bfa77f','metal'),
 artwork:item('装饰画','软装','artwork',800,50,1100,'#a88362','wood',{elevation:850})
};
export function resizeFurniture(f,key,value,locked=false){
 if(!['w','d','h'].includes(key)||!Number.isFinite(value)||value<10||value>20000)throw Error('家具尺寸范围 10～20000 mm');
 const ratio=value/f[key],next=locked?{w:f.w*ratio,d:f.d*ratio,h:f.h*ratio}:{[key]:value};
 if(Object.values(next).some(v=>v<10||v>20000))throw Error('等比调整后的尺寸超出范围');
 Object.assign(f,next);return f;
}
export function furnitureValid(f){
 if(!furnitureTypes[f.type]||![f.w,f.d,f.h].every(v=>Number.isFinite(v)&&v>=1&&v<=20000))return '家具尺寸无效';
 if(![f.x,f.y,f.rotation].every(v=>Number.isFinite(v)&&Math.abs(v)<=1e7))return '家具位置或角度无效';
 if(f.elevation!==undefined&&(!Number.isFinite(f.elevation)||f.elevation<0||f.elevation>20000))return '离地高度范围 0～20000 mm';
 return null;
}
