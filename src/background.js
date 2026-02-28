// TODO: 
/*
1. everyday at this hour
2. everyday at this hour with 5 minutes intervals
3. Every three days
*/
// const questions = [
//   {
//     question: "What are the different return types of asynchronous methods?",
//     answer: "Task, Task<T>, ValueTask, ValueTask<T>, void."
//   },
//   {
//     question: "What is the difference between ValueTask and Task?",
//     answer: "ValueTask is a lightweight alternative to Task for methods that may complete synchronously and avoids unnecessary allocations."
//   },
//   {
//     question: "What does a Task return?",
//     answer: "A Task represents an asynchronous operation and can return void (Task) or a value of type T (Task<T>)."
//   },
//   {
//     question: "What is ConfigureAwait?",
//     answer: "ConfigureAwait determines whether to resume on the original synchronization context after an awaited asynchronous call."
//   },
//   {
//     question: "What is the difference between Task.Delay and Thread.Sleep?",
//     answer: "Task.Delay is asynchronous and non-blocking, while Thread.Sleep blocks the current thread for a specified time."
//   },
//   {
//     question: "Differences between parallelism / concurrency / asynchrony",
//     answer: "Parallelism runs multiple tasks at the same time, concurrency handles multiple tasks logically at once, and asynchrony allows tasks to run without blocking."
//   },
//   {
//     question: "What is the difference between callbacks, promises/futures, and async/await?",
//     answer: "Callbacks execute code after a task completes, promises/futures represent eventual results, and async/await provides syntactic sugar for asynchronous code."
//   },
//   {
//     question: "What is an IHostedService?",
//     answer: "IHostedService is a .NET interface for background services that start and stop with the application."
//   },
//   {
//     question: "What is the difference between a thread and a Task?",
//     answer: "A thread is a low-level execution unit, while a Task represents an asynchronous operation managed by the runtime."
//   },
//   {
//     question: "How do you enable writing files in .NET?",
//     answer: "Writing files in .NET is done using classes like File, FileStream, StreamWriter, or File.WriteAllText/WriteAllBytes."
//   },
//   {
//     question: "What are FlagsAttributes?",
//     answer: "FlagsAttribute is used in enums to indicate that multiple values can be combined using bitwise operations."
//   },
//   {
//     question: "What is TCP?",
//     answer: "TCP (Transmission Control Protocol) is a connection-oriented protocol that ensures reliable, ordered, and error-checked delivery of data."
//   },
//   {
//     question: "What is UDP?",
//     answer: "UDP (User Datagram Protocol) is a connectionless protocol that sends data with minimal overhead but without guaranteed delivery."
//   },
//   {
//     question: "What is the difference between PUT and PATCH?",
//     answer: "PUT replaces the entire resource, while PATCH applies partial updates to an existing resource."
//   },
//   {
//     question: "Why is serialization important in a .NET endpoint call?",
//     answer: "Serialization converts objects to a format suitable for storage or transmission, enabling data exchange over APIs."
//   },
//   {
//     question: "What is a URI?",
//     answer: "A Uniform Resource Identifier (URI) is a unique string of characters used to identify a specific resource on the internet, such as a web page, image, or document"
//   },
//   {
//     question: "What is a regular expression?",
//     answer: "A regular expression is a pattern used to match or manipulate strings based on specific rules."
//   },
//   {
//     question: "What is a deadlock?",
//     answer: "A deadlock is a situation where two or more processes cannot proceed because each is waiting for the other to release resources."
//   },
// ];

//could you convert them into an array with  this format? Or one that you consider readable
const questions = [
  {
    question: "Bear",
    answer: "(Bore) (Born/Borne) [To carry]"
  },
  {
    question: "Beat",
    answer: "(Beat) (Beaten) [To hit repeatedly]"
  },
  {
    question: "Bend",
    answer: "(Bent) (Bent) [To curve something by distorting its shape]"
  },
  {
    question: "Bid",
    answer: "(Bid) (Bid) [To make an offer of money or services]"
  },
  {
    question: "Bid",
    answer: "(Bade) (Bidden) [To command or urge someone to do]"
  },
  {
    question: "Bide",
    answer: "(Bided/Bode) (Bided) [To wait for]"
  },
  {
    question: "Bind",
    answer: "(Bound) (Bound) [To tie something with string, or similar, to]"
  },
  {
    question: "Bite",
    answer: "(Bit) (Bitten) [To cut or hold with teeth]"
  },
  {
    question: "Blaw",
    answer: "(Blawed) (Blawn) [To blow]"
  },
  {
    question: "Blow",
    answer: "(Blew) (Blown) [To move air, wind and gases]"
  },
  {
    question: "Burn",
    answer: "(Burnt/Burned) (Burnt/Burned) [To consume or be consumed by fire]"
  },
  {
    question: "Bust",
    answer: "(Bust) (Bust) [To break]"
  },
  {
    question: "Cast",
    answer: "(Cast) (Cast) [To throw or project something]"
  },
  {
    question: "Clap",
    answer: "(Clapped/Clapt) (Clapped/Clapt) [To hit your hands together to make a sound ; To make a loud noise, like thunder]"
  },
  {
    question: "Come",
    answer: "(Came) (Come) [To move towards or to arrive at a specified]"
  },
  {
    question: "Cost",
    answer: "(Cost) (Cost) [The amount of money required to buy]"
  },
  {
    question: "Crow",
    answer: "(Crowed/Crew) (Crowed) [To boast ; To utter a sound indicating pleasure]"
  },
  {
    question: "Cut",
    answer: "(Cut) (Cut) [To break the surface of something with a]"
  },
  {
    question: "Dare",
    answer: "(Dared/Durst) (Dared) [To have sufficient courage]"
  },
  {
    question: "Deal",
    answer: "(Dealt) (Dealt) [To distribute, especially playing cards in]"
  },
  {
    question: "Dig",
    answer: "(Dug) (Dug) [To make a hole in the ground]"
  },
  {
    question: "Dive",
    answer: "(Dived/Dove) (Dived) [To jump head first into water]"
  },
  {
    question: "Do",
    answer: "(Did) (Done) [To perform or carry out]"
  },
  {
    question: "Dow",
    answer: "(Dought/Dowed) (Dought/Dowed) [To have the ability to do something]"
  },
  {
    question: "Draw",
    answer: "(Drew) (Drawn) [To make a picture using a pen or pencil]"
  },
  {
    question: "Eat",
    answer: "(Ate) (Eaten) [To consume solid food]"
  },
  {
    question: "Fall",
    answer: "(Fell) (Fallen) [To move downwards or to the ground]"
  },
  {
    question: "Feed",
    answer: "(Fed) (Fed) [To give or supply food]"
  },
  {
    question: "Feel",
    answer: "(Felt) (Felt) [To sense by touch ; To experience an emotion, or sensation]"
  },
  {
    question: "Find",
    answer: "(Found) (Found) [To discover something either by chance or]"
  },
  {
    question: "Fit",
    answer: "(Fit/Fitted) (Fit/Fitted) [To be the correct size, for clothes, etc. ; To measure someone for size (fit fit/fitted/]"
  },
  {
    question: "Flee",
    answer: "(Fled) (Fled) [To run away in order to find safety]"
  },
  {
    question: "Fly",
    answer: "(Flew) (Flown) [To move through the air ; To travel by aeroplane]"
  },
  {
    question: "Geld",
    answer: "(Gelded/Gelt) (Gelded/Gelt) [To castrate an animal]"
  },
  {
    question: "Get",
    answer: "(Got) (Got/Gotten) [To obtain, catch or receive]"
  },
  {
    question: "Gild",
    answer: "(Gilt/Gilded) (Gilt/Gilded) [To cover something with a thin layer of gold]"
  },
  {
    question: "Gin",
    answer: "(Gan) (Gan) [To begin something]"
  },
  {
    question: "Gird",
    answer: "(Girded/Girt) (Girded/Girt) [To secure or encirle something with a belt or]"
  },
  {
    question: "Gnaw",
    answer: "(Gnawed) (Gnawed/Gnawn) [To bite or chew]"
  },
  {
    question: "Go",
    answer: "(Went) (Gone/Been) [To travel to a place]"
  },
  {
    question: "Grow",
    answer: "(Grew) (Grown) [To increase in size]"
  },
  {
    question: "Hang",
    answer: "(Hung/Hanged) (Hung/Hanged) [To suspend from a support]"
  },
  {
    question: "Have",
    answer: "(Had) (Had) [To possess]"
  },
  {
    question: "Hear",
    answer: "(Heard) (Heard) [To detect or perceive sound]"
  },
  {
    question: "Hew",
    answer: "(Hewed) (Hewn) [To cut things into pieces]"
  },
  {
    question: "Hide",
    answer: "(Hid) (Hidden) [To conceal or put something where it cannot]"
  },
  {
    question: "Hit",
    answer: "(Hit) (Hit) [To touch somebody or something with force]"
  },
  {
    question: "Hold",
    answer: "(Held) (Held) [To secure something in your hand]"
  },
  {
    question: "Hurt",
    answer: "(Hurt) (Hurt) [To cause pain, injury or stress]"
  },
  {
    question: "Keep",
    answer: "(Kept) (Kept) [To have possession ; To make somebody or something stay in a]"
  },
  {
    question: "Ken",
    answer: "(Kent/Kenned) (Kent/Kenned) [To know]"
  },
  {
    question: "Knit",
    answer: "(Knit/Knitted) (Knit/Knitted) [To make clothes such as pullovers out of wool]"
  },
  {
    question: "Know",
    answer: "(Knew) (Known) [To be acquainted with ; To have correctly in your memory]"
  },
  {
    question: "Lade",
    answer: "(Laded) (Laden/Laded) [To load (put goods onto) a ship]"
  },
  {
    question: "Lay",
    answer: "(Laid) (Laid) [To put something in a horizontal position]"
  },
  {
    question: "Lead",
    answer: "(Led) (Led) [To take someone somewhere or guide them ; To be in command]"
  },
  {
    question: "Lean",
    answer: "(Leant/Leaned) (Leant/Leaned) [To place something at an incline for support]"
  },
  {
    question: "Leap",
    answer: "(Leapt/Leaped) (Leapt/Leaped) [To jump]"
  },
  {
    question: "Lend",
    answer: "(Lent) (Lent) [To give somebody money that must be]"
  },
  {
    question: "Lep",
    answer: "(Lept) (Lept) [To leap]"
  },
  {
    question: "Let",
    answer: "(Let) (Let) [To allow something to happen ; To allow someone to do something]"
  },
  {
    question: "Lie",
    answer: "(Lay) (Lain) [To get into or be in a horizontal position]"
  },
  {
    question: "Lose",
    answer: "(Lost) (Lost) [Not to have something because you do not]"
  },
  {
    question: "Make",
    answer: "(Made) (Made) [To create or construct something ; To cause somebody to do something ; To perform an action]"
  },
  {
    question: "Mean",
    answer: "(Meant) (Meant) [To signify]"
  },
  {
    question: "Meet",
    answer: "(Met) (Met) [To make somebody's acquaintance]"
  },
  {
    question: "Melt",
    answer: "(Melted) (Molten/Melted) [To change from solid into a liquid as the]"
  },
  {
    question: "Mow",
    answer: "(Mowed) (Mown) [To cut grass or cereals]"
  },
  {
    question: "Pay",
    answer: "(Paid) (Paid) [To give somebody money in exchange for]"
  },
  {
    question: "Pen",
    answer: "(Pent/Penned) (Pent/Penned) [To shut up or enclose in a cage, etc]"
  },
  {
    question: "will",
    answer: "(not) (become) [smaller when washed]"
  },
  {
    question: "Put",
    answer: "(Put) (Put) [To place something in a specific position]"
  },
  {
    question: "Quit",
    answer: "(Quit) (Quit) [To stop doing something ; To resign from a job]"
  },
  {
    question: "Rap",
    answer: "(Rapped/Rapt) (Rapped/Rapt) [To be very affected by strong emotion]"
  },
  {
    question: "Read",
    answer: "(Read) (Read) [To look at written words and understand them]"
  },
  {
    question: "Redd",
    answer: "(Redd/Redded) (Redd/Redded) [To save or rescue]"
  },
  {
    question: "Redo",
    answer: "(Redid) (Redone) [To do something again]"
  },
  {
    question: "Rend",
    answer: "(Rent) (Rent) [To tear or rip]"
  },
  {
    question: "Rid",
    answer: "(Rid/Ridded) (Rid/Ridded) [To dispose of]"
  },
  {
    question: "Ride",
    answer: "(Rode) (Ridden) [To travel by horse, bike or motorbike]"
  },
  {
    question: "Ring",
    answer: "(Rang) (Rung) [To telephone ; To make sounds with a bell]"
  },
  {
    question: "Rise",
    answer: "(Rose) (Risen) [To move upwards]"
  },
  {
    question: "Rive",
    answer: "(Rived) (Riven/Rived) [To break apart ot split]"
  },
  {
    question: "Run",
    answer: "(Ran) (Run) [To move quickly, so that both legs leave the]"
  },
  {
    question: "Saw",
    answer: "(Sawed) (Sawn/Sawed) [To cut wood, etc, with a tool]"
  },
  {
    question: "Say",
    answer: "(Said) (Said) [To speak words]"
  },
  {
    question: "See",
    answer: "(Saw) (Seen) [To notice with your eyes]"
  },
  {
    question: "Seek",
    answer: "(Sought) (Sought) [To try to find something]"
  },
  {
    question: "Sell",
    answer: "(Sold) (Sold) [To receive money in exchange for goods]"
  },
  {
    question: "Send",
    answer: "(Sent) (Sent) [To cause something to be taken to a specific]"
  },
  {
    question: "Set",
    answer: "(Set) (Set) [To place something somewhere ; To fix something in a particular position]"
  },
  {
    question: "Sew",
    answer: "(Sewed) (Sewn/Sewed) [To join pieces of material together using]"
  },
  {
    question: "Shed",
    answer: "(Shed) (Shed) [To fall off or let something fall off; snakes]"
  },
  {
    question: "Shew",
    answer: "(Shewed) (Shewn/Shewed) [Show]"
  },
  {
    question: "Shit",
    answer: "(Shat/Shit) (Shat/Shit) [To get rid of solid body waste]"
  },
  {
    question: "Shoe",
    answer: "(Shod) (Shod) [To provide with shoes, especially horses]"
  },
  {
    question: "Show",
    answer: "(Showed) (Shown) [To allow somebody to see something so that]"
  },
  {
    question: "Shut",
    answer: "(Shut) (Shut) [To close something]"
  },
  {
    question: "Sing",
    answer: "(Sang) (Sung) [To make music with your voice]"
  },
  {
    question: "Sink",
    answer: "(Sank) (Sunk) [To move downwards in water ; To make something move downwards in]"
  },
  {
    question: "Sit",
    answer: "(Sat) (Sat) [To support your body with your buttocks not]"
  },
  {
    question: "Slay",
    answer: "(Slew) (Slain) [To kill]"
  },
  {
    question: "Slit",
    answer: "(Slit) (Slit) [To make a long thin cut in something]"
  },
  {
    question: "Sow",
    answer: "(Sowed) (Sown) [To plant seeds in the ground to produce]"
  },
  {
    question: "Spin",
    answer: "(Span/Spun) (Spun) [To turn repeatedly in circles around a fixed ; To make something turn repeatedly in circles]"
  },
  {
    question: "Spit",
    answer: "(Spat/Spit) (Spat/Spit) [To eject saliva, liquid or food from the mouth]"
  },
  {
    question: "Swim",
    answer: "(Swam) (Swum) [To travel in water by moving your arms and]"
  },
  {
    question: "Take",
    answer: "(Took) (Taken) [To perform an action]"
  },
  {
    question: "Tear",
    answer: "(Tore) (Torn) [To make a hole or divi de material, paper, etc.]"
  },
  {
    question: "Tell",
    answer: "(Told) (Told) [To give somebody information]"
  },
  {
    question: "Tine",
    answer: "(Tint/Tined) (Tint/Tined) [To shut]"
  },
  {
    question: "Not",
    answer: "(to) (cook) [enough]"
  },
  {
    question: "Not",
    answer: "(to) (reach) [a traget]"
  },
  {
    question: "Undo",
    answer: "(Undid) (Undone) [To ruin somebody's reputation]"
  },
  {
    question: "Vex",
    answer: "(Vext/Vexed) (Vext/Vexed) [To trouble or annoy]"
  },
  {
    question: "Wake",
    answer: "(Woke) (Woken) [To stop sleeping and become conscious ; To make somebody stop sleeping]"
  },
  {
    question: "Wear",
    answer: "(Wore) (Worn) [To have clothes on your body]"
  },
  {
    question: "Wed",
    answer: "(Wed/Wedded) (Wed/Wedded) [To marry]"
  },
  {
    question: "Weep",
    answer: "(Wept) (Wept) [To cry heavily]"
  },
  {
    question: "Wend",
    answer: "(Wended/Went) (Wended/Went) [To go, make your way]"
  },
  {
    question: "Wet",
    answer: "(Wet/Wetted) (Wet/Wetted) [To make something wet by applying a liquid]"
  },
  {
    question: "Win",
    answer: "(Won) (Won) [To be the best in a competition, game,]"
  },
  {
    question: "Wind",
    answer: "(Wound) (Wound) [To turn something round to make a]"
  },
  {
    question: "Wit",
    answer: "(Wist) (Wist) [To know]"
  },
  {
    question: "Wont",
    answer: "(Wont) (Wont/Wonted) [To be accustomed]"
  },
  {
    question: "Work",
    answer: "(Worked/Wrought) (Worked/Wrought) [To make physical or mental effort to produce]"
  },
  {
    question: "Wrap",
    answer: "(Wrapped/Wrapt) (Wrapped/Wrapt) [To cover]"
  },
  {
    question: "Zinc",
    answer: "(Zinced/Zincked) (Zinced/Zincked) [To coat or cover something with a layer of]"
  },
  {
    question: "Abide",
    answer: "(Abode/Abided) (Abode/Abided/Abidden) [To continue]"
  },
  {
    question: "Alight",
    answer: "(Alit/Alighted) (Alit/Alighted) [To get off a bus, train, etc.]"
  },
  {
    question: "Arise",
    answer: "(Arose) (Arisen) [To originate ; To get up from horizontal position, out of bed ; To come into existence]"
  },
  {
    question: "Awake",
    answer: "(Awoke) (Awoken) [To stop sleeping and become conscious]"
  },
  {
    question: "Become",
    answer: "(Became) (Become) [To come into existence]"
  },
  {
    question: "Befall",
    answer: "(Befell) (Befallen) [To happen ; To happen to somebody or something]"
  },
  {
    question: "Beget",
    answer: "(Begot/Begat) (Begotten) [To cause something to happen]"
  },
  {
    question: "Begin",
    answer: "(Began) (Begun) [To start something]"
  },
  {
    question: "Begird",
    answer: "(Begirt/Begirded) (Begirt) [To encircle]"
  },
  {
    question: "Behold",
    answer: "(Beheld) (Beheld) [To become conscious of by seeing]"
  },
  {
    question: "Belay",
    answer: "(Belaid/Belayed) (Belaid/Belayed) [To secure a boat with a rope]"
  },
  {
    question: "Beset",
    answer: "(Beset) (Beset) [To be restricted and occupied by difficulties]"
  },
  {
    question: "Betake",
    answer: "(Betook) (Betaken) [To go to a place]"
  },
  {
    question: "Beweep",
    answer: "(Bewept) (Bewept) [To cry for or over someone or something]"
  },
  {
    question: "Bleed",
    answer: "(Bled) (Bled) [To lose blood through a cut in the skin]"
  },
  {
    question: "Blend",
    answer: "(Blended/Blent) (Blended/Blent) [To mix together]"
  },
  {
    question: "Bless",
    answer: "(Blessed/Blest) (Blessed/Blest) [To wish or confer happiness]"
  },
  {
    question: "Break",
    answer: "(Broke) (Broken) [To cause something to separate into at least]"
  },
  {
    question: "Breed",
    answer: "(Bred) (Bred) [To produce animals or plants by controlling]"
  },
  {
    question: "Bring",
    answer: "(Brought) (Brought) [To carry or convey something to the place]"
  },
  {
    question: "where",
    answer: "(you) (are) [going]"
  },
  {
    question: "Build",
    answer: "(Built) (Built) [To construct]"
  },
  {
    question: "Burst",
    answer: "(Burst) (Burst) [To break something open, usually by internal]"
  },
  {
    question: "Catch",
    answer: "(Caught) (Caught) [To receive ; To stop and hold a moving object, usually ; To make something unable to escape]"
  },
  {
    question: "Chide",
    answer: "(Chid) (Chid/Chidden) [To tell somebody off when they have done]"
  },
  {
    question: "Choose",
    answer: "(Chose) (Chosen) [To select]"
  },
  {
    question: "Cleave",
    answer: "(Cleft/Cleaved/Clove) (Cleft/Cleaved/Cloven) [To separate or divide something, often with ; To stick or hold together]"
  },
  {
    question: "Clepe",
    answer: "(Cleped) (Cleped/Ycleped/Yclept) [To call or name]"
  },
  {
    question: "Cling",
    answer: "(Clung) (Clung) [To hold on to or to stick to]"
  },
  {
    question: "Clothe",
    answer: "(Clad/Clothed) (Clad/Clothed) [To dress someone or provide them with]"
  },
  {
    question: "Creep",
    answer: "(Crept) (Crept) [To move along the ground lying down]"
  },
  {
    question: "knife",
    answer: "(or) (similar) [tool]"
  },
  {
    question: "Dight",
    answer: "(Dight/Dighted) (Dight/Dighted) [To dictate orders]"
  },
  {
    question: "Dream",
    answer: "(Dreamt/Dreamed) (Dreamt/Dreamed) [To see visual images while sleeping]"
  },
  {
    question: "Drink",
    answer: "(Drank) (Drunk) [To consume liquids]"
  },
  {
    question: "Drive",
    answer: "(Drove) (Driven) [To operate and control a car or other vehicle]"
  },
  {
    question: "Dwell",
    answer: "(Dwelt) (Dwelt) [To reside or live somewhere]"
  },
  {
    question: "Engird",
    answer: "(Engirt) (Engirt) [To encircle, encompass]"
  },
  {
    question: "Enwind",
    answer: "(Enwound) (Enwound) [To make into a coil ; To wrap around something]"
  },
  {
    question: "Fight",
    answer: "(Fought) (Fought) [To try to hurt or kill someone in combat or]"
  },
  {
    question: "Fling",
    answer: "(Flung) (Flung) [To throw or move something suddenly]"
  },
  {
    question: "Forbid",
    answer: "(Forbade/Forbad) (Forbidden) [To prohibit]"
  },
  {
    question: "Forego",
    answer: "(Forewent) (Foregone) [To preceed something ; To go without something]"
  },
  {
    question: "Forget",
    answer: "(Forgot) (Forgotten) [To be unable to remember something]"
  },
  {
    question: "Freeze",
    answer: "(Froze) (Frozen) [To make liquids into solids by cold ; To store food below zero degrees centigrade]"
  },
  {
    question: "Grave",
    answer: "(Graved) (Graven/Graved) [To dig ; To fix in the memory]"
  },
  {
    question: "Grind",
    answer: "(Ground) (Ground) [To break something into a powder]"
  },
  {
    question: "Heave",
    answer: "(Heaved/Hove) (Heaved/Hove) [To lift something heavy ; To throw something heavy]"
  },
  {
    question: "Hight",
    answer: "(Hote/Hight) (Hoten) [To name]"
  },
  {
    question: "Hoise",
    answer: "(Hoised/Hoist) (Hoised/Hoist) [To hoist or lift]"
  },
  {
    question: "Hoist",
    answer: "(Hoist/Hoisted) (Hoist/Hoisted) [To raise or lift using ropes, etc]"
  },
  {
    question: "while",
    answer: "(they) (are) [away]"
  },
  {
    question: "sexual",
    answer: "(relations) (between) [close relatives]"
  },
  {
    question: "Inhold",
    answer: "(Inheld) (Inheld) [To have as an inherent characteristic]"
  },
  {
    question: "Inlay",
    answer: "(Inlaid) (Inlaid) [To put a different material inside another for]"
  },
  {
    question: "Input",
    answer: "(Input/Inputted) (Input/Inputted) [To enter data into a computer]"
  },
  {
    question: "Inset",
    answer: "(Inset) (Inset) [To put a picture or graphic inside a lerger one]"
  },
  {
    question: "Inwind",
    answer: "(Inwound) (Inwound) [To wrap or coil around]"
  },
  {
    question: "Kneel",
    answer: "(Knelt/Kneeled) (Knelt/Kneeled) [To support yourself on your knees]"
  },
  {
    question: "Learn",
    answer: "(Learnt/Learned) (Learnt/Learned) [To acquire knowledge]"
  },
  {
    question: "Leave",
    answer: "(Left) (Left) [To go out of a place]"
  },
  {
    question: "Light",
    answer: "(Lit) (Lit) [To make something burn]"
  },
  {
    question: "Miscut",
    answer: "(Miscut) (Miscut) [To cut something wrongly or badly]"
  },
  {
    question: "Misdo",
    answer: "(Misdid) (Misdone) [To harm or injure]"
  },
  {
    question: "Mishit",
    answer: "(Mishit) (Mishit) [To hit a ball badly or inaccurately]"
  },
  {
    question: "Mislay",
    answer: "(Mislaid) (Mislaid) [To lose or put something where you cannot]"
  },
  {
    question: "Missay",
    answer: "(Missaid) (Missaid) [To say something incorrectly ; To talk badly about someone]"
  },
  {
    question: "Misset",
    answer: "(Misset) (Misset) [To set or place wrongly or incorrectly]"
  },
  {
    question: "Miswed",
    answer: "(Miswed/Miswedded) (Miswed/Miswedded) [To marry wrongly]"
  },
  {
    question: "Naysay",
    answer: "(Naysaid) (Naysaid) [To oppose or criticise]"
  },
  {
    question: "Offset",
    answer: "(Offset) (Offset) [To compenaste or counterbalance]"
  },
  {
    question: "Outbid",
    answer: "(Outbid) (Outbid) [To offer more money than someone in an]"
  },
  {
    question: "Outdo",
    answer: "(Outdid) (Outdone) [To do better than someone]"
  },
  {
    question: "Outfly",
    answer: "(Outflew) (Outflown) [To fly faster or further]"
  },
  {
    question: "Outlay",
    answer: "(Outlaid) (Outlaid) [To spend money for a particular purpose]"
  },
  {
    question: "Output",
    answer: "(Output/Outputted) (Output/Outputted) [To put out or produce]"
  },
  {
    question: "Outrun",
    answer: "(Outran) (Outrun) [To run or go faster than someone]"
  },
  {
    question: "Outsee",
    answer: "(Outsaw) (Outseen) [To see further ; To have greater foresight]"
  },
  {
    question: "Outsit",
    answer: "(Outsat) (Outsat) [To sit for longer than someone]"
  },
  {
    question: "Overdo",
    answer: "(Overdid) (Overdone) [To do something to excess ; To cook something too much]"
  },
  {
    question: "Plead",
    answer: "(Pled/Pleaded) (Pled/Pleaded) [To tell a court that you are guilty or innocent ; To ask for special treatment by authorities,]"
  },
  {
    question: "Precut",
    answer: "(Precut) (Precut) [To cut something before selling or assembling]"
  },
  {
    question: "Predo",
    answer: "(Predid) (Predone) [To do something before a certain time of]"
  },
  {
    question: "Prepay",
    answer: "(Prepaid) (Prepaid) [To pay for something using it]"
  },
  {
    question: "Preset",
    answer: "(Preset) (Preset) [To arrange something before it is needed]"
  },
  {
    question: "Prove",
    answer: "(Proved) (Proven/Proved) [To demonstrate that something is true]"
  },
  {
    question: "Reave",
    answer: "(Reft/Reaved) (Reft/Reaved) [To deprive ; To take by force]"
  },
  {
    question: "Rebid",
    answer: "(Rebid) (Rebid) [To bid again]"
  },
  {
    question: "Rebind",
    answer: "(Rebound) (Rebound) [To cover a book again]"
  },
  {
    question: "Recast",
    answer: "(Recast) (Recast) [To replace an actor or actress]"
  },
  {
    question: "Recut",
    answer: "(Recut) (Recut) [To cut again or differently]"
  },
  {
    question: "Redeal",
    answer: "(Redealt) (Redealt) [To deal playing cards again]"
  },
  {
    question: "Redraw",
    answer: "(Redrew) (Redrawn) [To draw again]"
  },
  {
    question: "Reeve",
    answer: "(Rove/Reeved) (Rove/Reeved) [To gather together ; To thread something through a hole]"
  },
  {
    question: "Refit",
    answer: "(Refit) (Refit) [To repair a ship, plane or vehicle ; To fit something again]"
  },
  {
    question: "Regrow",
    answer: "(Regrew) (Regrown) [To grow again]"
  },
  {
    question: "Rehang",
    answer: "(Rehung) (Rehung) [To hang again or in a different position]"
  },
  {
    question: "Rehear",
    answer: "(Reheard) (Reheard) [To hear something again]"
  },
  {
    question: "Reknit",
    answer: "(Reknit/Reknitted) (Reknit/Reknitted) [To knit again ; To join back together]"
  },
  {
    question: "Relay",
    answer: "(Relaid) (Relaid) [To operate a system where things are]"
  },
  {
    question: "Remake",
    answer: "(Remade) (Remade) [To make something again, such as a new]"
  },
  {
    question: "Repay",
    answer: "(Repaid) (Repaid) [To pay somebody money owed]"
  },
  {
    question: "Reread",
    answer: "(Reread) (Reread) [To read again]"
  },
  {
    question: "Rerun",
    answer: "(Reran) (Rerun) [To show a film again]"
  },
  {
    question: "Resell",
    answer: "(Resold) (Resold) [To sell something again]"
  },
  {
    question: "Resend",
    answer: "(Resent) (Resent) [To send something again]"
  },
  {
    question: "Reset",
    answer: "(Reset) (Reset) [To put something back to the original way it]"
  },
  {
    question: "Resew",
    answer: "(Resewed) (Resewn/Reswed) [To sew again]"
  },
  {
    question: "Resit",
    answer: "(Resat) (Resat) [To take an exam or test again]"
  },
  {
    question: "Resow",
    answer: "(Resowed) (Resown/Resowed) [To sow again]"
  },
  {
    question: "Retake",
    answer: "(Retook) (Retaken) [Take again, especially exams and tests]"
  },
  {
    question: "Retear",
    answer: "(Retore) (Retorn) [To tear again, usually of injuries]"
  },
  {
    question: "Retell",
    answer: "(Retold) (Retold) [To tell something again]"
  },
  {
    question: "Rewake",
    answer: "(Rewoke/Rewaked) (Rewoken/Rewaked) [To wake again]"
  },
  {
    question: "Rewear",
    answer: "(Rewore) (Reworn) [To wear again]"
  },
  {
    question: "Rewed",
    answer: "(Rewed/Rewedded) (Rewed/Rewedded) [To marry again]"
  },
  {
    question: "Rewet",
    answer: "(Rewet/Rewetted) (Rewet/Rewetted) [To wet again]"
  },
  {
    question: "Rewin",
    answer: "(Rewon) (Rewon) [To win again]"
  },
  {
    question: "Shake",
    answer: "(Shook) (Shaken) [To vibrate ; To make something vibrate]"
  },
  {
    question: "Shave",
    answer: "(Shaved) (Shaven/Shaved) [To remove body hair]"
  },
  {
    question: "Shear",
    answer: "(Shore/Sheared) (Shorn/Sheared) [To cut with scissors, especially wool from]"
  },
  {
    question: "Shend",
    answer: "(Shent) (Shent) [To shame or disgrace]"
  },
  {
    question: "Shine",
    answer: "(Shone) (Shone) [To give off or reflect bright light]"
  },
  {
    question: "Shoot",
    answer: "(Shot) (Shot) [To fire a bullet from a gun ; To kill or hurt somebody with a gun]"
  },
  {
    question: "Shrive",
    answer: "(Shrove) (Shriven) [To confess or listen to a confession, a]"
  },
  {
    question: "Sleep",
    answer: "(Slept) (Slept) [To be in a relaxed state with your eyes closed]"
  },
  {
    question: "Slide",
    answer: "(Slid) (Slid/Slidden) [To move on a smooth surface, such as ice]"
  },
  {
    question: "Sling",
    answer: "(Slung) (Slung) [To throw something somewhere]"
  },
  {
    question: "Slink",
    answer: "(Slunk) (Slunk) [To move in a suspicious and guilty way]"
  },
  {
    question: "Smell",
    answer: "(Smelt/Smelled) (Smelt/Smelled) [To detect odours with your nose]"
  },
  {
    question: "Smite",
    answer: "(Smote) (Smitten) [To hit]"
  },
  {
    question: "Sneak",
    answer: "(Sneaked/Snuck) (Sneaked/Snuck) [To move around guiltily or to avoid being]"
  },
  {
    question: "Speak",
    answer: "(Spoke) (Spoken) [To say words with your mouth ; To be able to use a language]"
  },
  {
    question: "Speed",
    answer: "(Sped/Speeded) (Sped/Speeded) [To move quickly ; To drive faster than legally permitted]"
  },
  {
    question: "Spell",
    answer: "(Spelt/Spelled) (Spelt/Spelled) [To use the correct combination of letters for a]"
  },
  {
    question: "Spend",
    answer: "(Spent) (Spent) [To Use money to buy things ; To use time or energy doimg something]"
  },
  {
    question: "Spill",
    answer: "(Spilt/Spilled) (Spilt/Spilled) [To allow liquids out of their containers]"
  },
  {
    question: "Split",
    answer: "(Split) (Split) [To divide]"
  },
  {
    question: "Spoil",
    answer: "(Spoilt/Spoiled) (Spoilt/Spoiled) [To let something go bad]"
  },
  {
    question: "Spread",
    answer: "(Spread) (Spread) [To cover the surface of one thing with]"
  },
  {
    question: "Spring",
    answer: "(Sprang) (Sprung) [To jump]"
  },
  {
    question: "Stand",
    answer: "(Stood) (Stood) [To be in a vertical position with the weight on ; To get into this position]"
  },
  {
    question: "Stave",
    answer: "(Stove/Staved/Stoved) (Stove/Staved/Stoved) [To break a hole in something]"
  },
  {
    question: "Steal",
    answer: "(Stole) (Stolen) [To take property or money that is not yours]"
  },
  {
    question: "Stick",
    answer: "(Stuck) (Stuck) [To attach things with glue ; To insert a sharp object into something]"
  },
  {
    question: "Sting",
    answer: "(Stung) (Stung) [To feel pain caused by an insect or plant or in]"
  },
  {
    question: "Stink",
    answer: "(Stank) (Stunk) [To smell very badly]"
  },
  {
    question: "Strew",
    answer: "(Strewed) (Strewn/Strewed) [To distribute things randomly over a surface]"
  },
  {
    question: "Stride",
    answer: "(Strode/Strided) (Stridden) [To walk confidently]"
  },
  {
    question: "Strike",
    answer: "(Struck) (Struck/Stricken) [To stop working as a protest about working]"
  },
  {
    question: "String",
    answer: "(Strung) (Strung) [To attach something using a cord]"
  },
  {
    question: "Strip",
    answer: "(Stript/Stripped) (Stript/Stripped) [To undress ; To remove the covering of something]"
  },
  {
    question: "Strive",
    answer: "(Strove) (Striven) [To try very hard to do something]"
  },
  {
    question: "Sublet",
    answer: "(Sublet) (Sublet) [To rent something you have rented]"
  },
  {
    question: "Swear",
    answer: "(Swore) (Sworn) [To use words which are regarded as offensive]"
  },
  {
    question: "Sweat",
    answer: "(Sweat/Sweated) (Sweat/Sweated) [To perspire]"
  },
  {
    question: "Sweep",
    answer: "(Swept/Sweeped) (Swept/Sweeped) [To clean floors using a brush]"
  },
  {
    question: "Swell",
    answer: "(Swelled) (Swollen) [To increase in size usually by filling with]"
  },
  {
    question: "Swing",
    answer: "(Swung) (Swung) [To move from side to side from a fixed point]"
  },
  {
    question: "Swink",
    answer: "(Swank/Swonk) (Swonken) [To work, toil or labour]"
  },
  {
    question: "Teach",
    answer: "(Taught) (Taught) [To instruct or train somebody]"
  },
  {
    question: "Think",
    answer: "(Thought) (Thought) [To have an opinion ; To use the brain]"
  },
  {
    question: "Thrive",
    answer: "(Throve/Thrived) (Thriven/Thrived) [To do very well because the circumstances or]"
  },
  {
    question: "Throw",
    answer: "(Threw) (Thrown) [To cause an object to leave your hand in such]"
  },
  {
    question: "Thrust",
    answer: "(Thrust) (Thrust) [To push with force]"
  },
  {
    question: "Tread",
    answer: "(Trod) (Trodden) [To put your foot down]"
  },
  {
    question: "Unbear",
    answer: "(Unbore) (Unborn/Unborne) [To remove a horse's rein and straps]"
  },
  {
    question: "Unbend",
    answer: "(Unbent) (Unbent) [To retore something to its original shape that]"
  },
  {
    question: "Unbind",
    answer: "(Unbound) (Unbound) [To set something free]"
  },
  {
    question: "Undraw",
    answer: "(Undrew) (Undrawn) [To open a curtain]"
  },
  {
    question: "Undraw",
    answer: "(Undrew) (Undrawn) [To open, draw back (curtains, etc)]"
  },
  {
    question: "Unhang",
    answer: "(Unhung) (Unhung) [To remove something that is hanging]"
  },
  {
    question: "Unhide",
    answer: "(Unhid) (Unhidden) [To expose something that was hidden]"
  },
  {
    question: "Unhold",
    answer: "(Unheld) (Unheld) [To stop holding or not to hold]"
  },
  {
    question: "Unknit",
    answer: "(Unknit/Unknitted) (Unknit/Unknitted) [To untie]"
  },
  {
    question: "Unlade",
    answer: "(Unladed) (Unladen/Unladed) [To remove cargo, unload]"
  },
  {
    question: "Unlay",
    answer: "(Unlaid) (Unlaid) [To untwist a rope]"
  },
  {
    question: "Unmake",
    answer: "(Unmade) (Unmade) [To remove a decision]"
  },
  {
    question: "Unsay",
    answer: "(Unsaid) (Unsaid) [Not to say something ; To take back something that you said]"
  },
  {
    question: "Unsell",
    answer: "(Unsold) (Unsold) [To convince someone that something is]"
  },
  {
    question: "Unsew",
    answer: "(Unsewed) (Unsewn/Unsewed) [To undo someone sewed, remove the stitches]"
  },
  {
    question: "Unspin",
    answer: "(Unspun) (Unspun) [To untwist or unravel]"
  },
  {
    question: "Unwind",
    answer: "(Unwound) (Unwound) [To relax]"
  },
  {
    question: "Uphold",
    answer: "(Upheld) (Upheld) [To support or confirm a decision]"
  },
  {
    question: "Upset",
    answer: "(Upset) (Upset) [To make somebody unhappy or disturbed]"
  },
  {
    question: "Uptear",
    answer: "(Uptore) (Uptorn) [To tear into pieces]"
  },
  {
    question: "Waylay",
    answer: "(Waylaid) (Waylaid) [To wait for or to stop somebody to rob them]"
  },
  {
    question: "Weave",
    answer: "(Wove) (Woven) [To make material]"
  },
  {
    question: "Wreak",
    answer: "(Wreaked) (Wreaked/Wroken) [To cause or make something happen]"
  },
  {
    question: "Wring",
    answer: "(Wrung) (Wrung) [To put a lot of pressure on something to]"
  },
  {
    question: "Write",
    answer: "(Wrote) (Written) [To put words onto paper using a pen or pencil]"
  },
  {
    question: "Backbite",
    answer: "(Backbit) (Backbitten) [To speak badly about someone]"
  },
  {
    question: "Backfit",
    answer: "(Backfit) (Backfit) [To fit new parts into an older machine that]"
  },
  {
    question: "Bedight",
    answer: "(Bedight/Bedighted) (Bedight/Bedighted) [To adorn, decorate]"
  },
  {
    question: "Behight",
    answer: "(Behight) (Behight/Behoten) [To promise or vow]"
  },
  {
    question: "Beseech",
    answer: "(Besought/Beseeched) (Besought/Beseeched) [To ask someone very insistently to do]"
  },
  {
    question: "Bespeak",
    answer: "(Bespoke) (Bespoken) [To be a signal or symbol of something ; To set aside or reserve something]"
  },
  {
    question: "Bestrew",
    answer: "(Bestrewed) (Bestrewed/Bestrewn) [To cover a surface by throwing things about]"
  },
  {
    question: "Bestride",
    answer: "(Bestrode) (Bestridden) [To sit or stand with one leg on either side of]"
  },
  {
    question: "Bethink",
    answer: "(Bethought) (Bethought) [To think about something]"
  },
  {
    question: "Browbeat",
    answer: "(Browbeat) (Browbeat/Browbeaten) [To put pressure on someone or bully them to]"
  },
  {
    question: "Cowrite",
    answer: "(Cowrote) (Cowritten) [To write with someone]"
  },
  {
    question: "Dispread",
    answer: "(Dispread) (Dispread) [To spread out]"
  },
  {
    question: "Disprove",
    answer: "(Disproved) (Disproven/Disproved) [To prove that something is fale or wrong]"
  },
  {
    question: "Dogfight",
    answer: "(Dogfought) (Dogfought) [To fight in aeroplanes ; To arrange a fight between dogs for sport]"
  },
  {
    question: "Engrave",
    answer: "(Engraved) (Engraved/Engraven) [To carve letters or a pattern into the surface]"
  },
  {
    question: "Farebeat",
    answer: "(Farebeat) (Farebeaten) [To avoid paying fares when using public]"
  },
  {
    question: "Flyblow",
    answer: "(Flyblew) (Flyblown) [To contaminate by laying eggs, the way a fly]"
  },
  {
    question: "Forbear",
    answer: "(Forbore) (Forborne/Forborn) [Not to use or talk about something]"
  },
  {
    question: "Forecast",
    answer: "(Forecast/Forecasted) (Forecast/Forecasted) [To predict the future]"
  },
  {
    question: "Forefeel",
    answer: "(Forefelt) (Forefelt) [To have a feeling before something happens ; To have a premonition]"
  },
  {
    question: "Foreknow",
    answer: "(Foreknew) (Foreknown) [To know something beforehand]"
  },
  {
    question: "Forerun",
    answer: "(Foreran) (Forerun) [To go before something ; To show that something is going to happen]"
  },
  {
    question: "Foresee",
    answer: "(Foresaw) (Foreseen) [To predict or see the future]"
  },
  {
    question: "Foreshow",
    answer: "(Foreshowed) (Forshowed/Foreshown) [To show something or make it known]"
  },
  {
    question: "Foretell",
    answer: "(Foretold) (Foretold) [To predict the future]"
  },
  {
    question: "Forgive",
    answer: "(Forgave) (Forgiven) [To pardon or stop being angry with someone]"
  },
  {
    question: "Forlese",
    answer: "(Forlore) (Forlorn) [To lose completely]"
  },
  {
    question: "Forswear",
    answer: "(Forswore) (Forsworn) [To make a false promise or oath]"
  },
  {
    question: "Fraught",
    answer: "(Fraught/Fraughted) (Fraught/Fraughted) [To stock ; To load a ship, etc ; To hire a ship, etc]"
  },
  {
    question: "Gainsay",
    answer: "(Gainsaid) (Gainsaid) [To contradict or deny]"
  },
  {
    question: "Hagride",
    answer: "(Hagrode) (Hagridden) [To torment or cause nightmares]"
  },
  {
    question: "Handsew",
    answer: "(Handsewed) (Handsewn/Handsewed) [To sew by hand]"
  },
  {
    question: "Inbreed",
    answer: "(Inbred) (Inbred) [To produce babies with health problems by]"
  },
  {
    question: "Indwell",
    answer: "(Indwelt) (Indwelt) [To inhabit ; To exist as a guiding principle]"
  },
  {
    question: "Intercut",
    answer: "(Intercut) (Intercut) [To move between differe nt scenes or stories]"
  },
  {
    question: "Interlay",
    answer: "(Interlaid) (Interlaid) [To place among or between things]"
  },
  {
    question: "Interset",
    answer: "(Interset) (Interset) [To set among or between things]"
  },
  {
    question: "Inweave",
    answer: "(Inwove/Inweaved) (Inwoven/Inweaved) [To weave things together]"
  },
  {
    question: "Miscast",
    answer: "(Miscast) (Miscast) [To choose the wrong actor for a role]"
  },
  {
    question: "Misdeal",
    answer: "(Misdealt) (Misdealt) [To distribute playing cards wrongly in a game]"
  },
  {
    question: "Misfall",
    answer: "(Misfell) (Misfallen) [To happen unluckily]"
  },
  {
    question: "Misfeed",
    answer: "(Misfed) (Misfed) [To feed incorrectly]"
  },
  {
    question: "Misgive",
    answer: "(Misgave) (Misgiven) [To become suspicious or worried]"
  },
  {
    question: "Mishear",
    answer: "(Misheard) (Misheard) [To hear something incorrectly]"
  },
  {
    question: "Misknow",
    answer: "(Misknew) (Misknown) [To have the wrong idea about something]"
  },
  {
    question: "Mislead",
    answer: "(Misled) (Misled) [To make someone behave wrongly]"
  },
  {
    question: "Mislearn",
    answer: "(Mislearnt/Mislearned) (Mislearnt/Mislearned) [To learn wrongly]"
  },
  {
    question: "Misread",
    answer: "(Misread) (Misread) [To read something incorrectly]"
  },
  {
    question: "Missend",
    answer: "(Missent) (Missent) [To send to the wrong place or person]"
  },
  {
    question: "Misspeak",
    answer: "(Misspoke) (Misspoken) [To say or pronounce something wrongly ; To say something that is incorrect or]"
  },
  {
    question: "Misspell",
    answer: "(Misspelt/Misspelled) (Misspelt/Misspelled) [To write a word without using the correct]"
  },
  {
    question: "Misspend",
    answer: "(Misspent) (Misspent) [To waste time or money]"
  },
  {
    question: "Misswear",
    answer: "(Misswore) (Missworn) [To swear or make an oath falsely]"
  },
  {
    question: "Mistake",
    answer: "(Mistook) (Mistaken) [Not to understand ; To confuse somebody with someone else]"
  },
  {
    question: "Misteach",
    answer: "(Mistaught) (Mistaught) [To teach wrongly or incorrectly]"
  },
  {
    question: "Mistell",
    answer: "(Mistold) (Mistold) [To tell something wrongly]"
  },
  {
    question: "Misthink",
    answer: "(Misthought) (Misthought) [To have mistaken thoughts or ideas]"
  },
  {
    question: "Miswear",
    answer: "(Misswore) (Misworn) [To wear badly]"
  },
  {
    question: "Miswrite",
    answer: "(Miswrote) (Miswritten) [To write something incorrectly]"
  },
  {
    question: "Outbreed",
    answer: "(Outbred) (Outbred) [To breed faster than others]"
  },
  {
    question: "Outdraw",
    answer: "(Outdrew) (Outdrawn) [To pull out ; To pull a gun faster than an opponent]"
  },
  {
    question: "Outdrink",
    answer: "(Outdrank) (Outdrunk) [To drink more than someone else, usually]"
  },
  {
    question: "Outdrive",
    answer: "(Outdrove) (Outdriven) [To drive faster or better]"
  },
  {
    question: "Outfight",
    answer: "(Outfought) (Outfought) [To fight better than someone]"
  },
  {
    question: "Outgrow",
    answer: "(Outgrew) (Outgrown) [To grow faster than something or someone ; To become too big or mature for something]"
  },
  {
    question: "Outleap",
    answer: "(Outleapt/Outleaped) (Outleapt/Outleaped) [To jump or leap further or higher]"
  },
  {
    question: "Outride",
    answer: "(Outrode) (Outridden) [To ride faster than someone]"
  },
  {
    question: "Outsell",
    answer: "(Outsold) (Outsold) [To sell more than something or someone]"
  },
  {
    question: "Outshine",
    answer: "(Outshone) (Outshone) [To be better than someone]"
  },
  {
    question: "Outshoot",
    answer: "(Outshot) (Outshot) [To shoot faster or better]"
  },
  {
    question: "Outsing",
    answer: "(Outsang) (Outsung) [To sing better or louder than someone]"
  },
  {
    question: "Outsleep",
    answer: "(Outslept) (Outslept) [To sleep for longer than someone]"
  },
  {
    question: "Outsmell",
    answer: "(Outsmelt/Outsmelled) (Outsmelt/Outsmelled) [To have a better sense of smell]"
  },
  {
    question: "Outspeak",
    answer: "(Outspoke) (Outspoken) [To speak better or more than someone]"
  },
  {
    question: "Outspeed",
    answer: "(Outsped) (Outsped) [To go faster than someone or something]"
  },
  {
    question: "Outspend",
    answer: "(Outspent) (Outspent) [To spend more than someone]"
  },
  {
    question: "Outspin",
    answer: "(Outspun) (Outspun) [To finish or die]"
  },
  {
    question: "Outstand",
    answer: "(Outstood) (Outstood) [To be clearly different or better]"
  },
  {
    question: "Outswear",
    answer: "(Outswore) (Outsworn) [To exceed someone in swearing- oaths or bad]"
  },
  {
    question: "Outswim",
    answer: "(Outswam) (Outswum) [To swim faster or further than someone]"
  },
  {
    question: "Outtell",
    answer: "(Outtold) (Outtold) [To be better or exceed in telling or calculating]"
  },
  {
    question: "Outthink",
    answer: "(Outthought) (Outthought) [To think better ideas than someone]"
  },
  {
    question: "Outthrow",
    answer: "(Outthrew) (Outthrown) [To throw further or more accurately]"
  },
  {
    question: "Outwind",
    answer: "(Outwound) (Outwound) [To unloose]"
  },
  {
    question: "Outwrite",
    answer: "(Outwrote) (Outwritten) [To be better at writing]"
  },
  {
    question: "Overbear",
    answer: "(Overbore) (Overborne) [To use force or authority to control]"
  },
  {
    question: "Overbid",
    answer: "(Overbid) (Overbid) [To bid more something is worth ; To bid more than you can win in a card game]"
  },
  {
    question: "Overblow",
    answer: "(Overblew) (Overblown) [To become subdued ; To force too much]"
  },
  {
    question: "Overbuy",
    answer: "(Overbought) (Overbought) [To buy too much ; To pay too much]"
  },
  {
    question: "Overcast",
    answer: "(Overcast) (Overcast) [To become cloudy ; To sew with overcast stitiches (long slanting]"
  },
  {
    question: "Overcome",
    answer: "(Overcame) (Overcome) [To master a problem or difficult situation ; To become helpless because of excessive]"
  },
  {
    question: "emotions",
    answer: "(or) (physical) [difficulties]"
  },
  {
    question: "Overcut",
    answer: "(Overcut) (Overcut) [To cut down more trees than permitted]"
  },
  {
    question: "Overdraw",
    answer: "(Overdrew) (Overdrawn) [To take money out of an account so that a]"
  },
  {
    question: "Overeat",
    answer: "(Overate) (Overeaten) [To eat too much]"
  },
  {
    question: "Overfeed",
    answer: "(Overfed) (Overfed) [To give too much food]"
  },
  {
    question: "Overfly",
    answer: "(Overflew) (Overflown) [To fly over a place]"
  },
  {
    question: "Overgrow",
    answer: "(Overgrew) (Overgrown) [To grow too big or beyond a limit or boundary]"
  },
  {
    question: "Overhang",
    answer: "(Overhung) (Overhung) [To be above something]"
  },
  {
    question: "Overhear",
    answer: "(Overheard) (Overheard) [To hear something accidently that was not]"
  },
  {
    question: "Overlay",
    answer: "(Overlaid) (Overlaid) [To cover something with a layer]"
  },
  {
    question: "Overleap",
    answer: "(Overleapt/Overleaped) (Overleapt/Overleaped) [To jump over]"
  },
  {
    question: "Overlie",
    answer: "(Overlay) (Overlain) [To lie on top of ; To kill by lying on top of]"
  },
  {
    question: "Overpass",
    answer: "(Overpast/Overpassed) (Overpast/Overpassed) [To cross, pass over]"
  },
  {
    question: "Overpay",
    answer: "(Overpaid) (Overpaid) [To pay too much]"
  },
  {
    question: "Override",
    answer: "(Overrode) (Overridden) [To ride through an enemy's country]"
  },
  {
    question: "Overrun",
    answer: "(Overran) (Overrun) [To flood ; To invade and take control]"
  },
  {
    question: "Oversee",
    answer: "(Oversaw) (Overseen) [To observe people's work to make sure that it]"
  },
  {
    question: "Oversell",
    answer: "(Oversold) (Oversold) [To sell too much ; To publicise too much]"
  },
  {
    question: "Oversew",
    answer: "(Oversewed) (Oversewn/Oversewed) [To sew two edges together with stitches]"
  },
  {
    question: "Oversow",
    answer: "(Oversowed) (Oversown/Oversowed) [To sow on land that has already be sown]"
  },
  {
    question: "Overspin",
    answer: "(Overspun) (Overspun) [To make something last too long]"
  },
  {
    question: "Overtake",
    answer: "(Overtook) (Overtaken) [To pass a vehicle that is going more slowly]"
  },
  {
    question: "Overwear",
    answer: "(Overwore) (Overworn) [To wear something too much or often, or]"
  },
  {
    question: "Overwind",
    answer: "(Overwound) (Overwound) [To wind a clock or something too much so it]"
  },
  {
    question: "Partake",
    answer: "(Partook) (Partaken) [To take part in something or a part of]"
  },
  {
    question: "Potshot",
    answer: "(Potshot/Potshotted) (Potshot) [To shoot at random ; To criticise at random]"
  },
  {
    question: "Prebind",
    answer: "(Prebound) (Prebound) [To bind before]"
  },
  {
    question: "Prebuild",
    answer: "(Prebuilt) (Prebuilt) [Prefabricate]"
  },
  {
    question: "Premake",
    answer: "(Premade) (Premade) [To make something befo re a time or stage]"
  },
  {
    question: "Presell",
    answer: "(Presold) (Presold) [To sell before a certain time]"
  },
  {
    question: "Presplit",
    answer: "(Presplit) (Presplit) [To split or divide before a certain time]"
  },
  {
    question: "Reawake",
    answer: "(Reawoke) (Reawoken/Reawaken) [To wake up again]"
  },
  {
    question: "Rebuild",
    answer: "(Rebuilt) (Rebuilt) [To build something again]"
  },
  {
    question: "Regrind",
    answer: "(Reground) (Reground) [To grind again ; To smooth worn engine parts]"
  },
  {
    question: "replaced",
    answer: "(as) (they) [become used or tired]"
  },
  {
    question: "Relearn",
    answer: "(Relearnt/Relearned) (Relearnt/Relearned) [To learn again]"
  },
  {
    question: "Relight",
    answer: "(Relit/Relighted) (Relit/Relighted) [To light or start something burning again]"
  },
  {
    question: "version",
    answer: "(of) (a) [film]"
  },
  {
    question: "Reshoot",
    answer: "(Reshot) (Reshot) [To shoot a film scene again]"
  },
  {
    question: "Respell",
    answer: "(Respelled/Respelt) (Respelled/Respelt) [To spell again]"
  },
  {
    question: "Restring",
    answer: "(Restrung) (Restrung) [To fit new strings on a musical instrument or]"
  },
  {
    question: "Reteach",
    answer: "(Retaught) (Retaught) [To teach again]"
  },
  {
    question: "Rethink",
    answer: "(Rethought) (Rethought) [To think again]"
  },
  {
    question: "Retread",
    answer: "(Retrod) (Retrodden) [To tread again ; To cut new tread in a tyre]"
  },
  {
    question: "Retrofit",
    answer: "(Retrofit/Retrofitted) (Retrofit/Retrofitted) [To fit new parts into an older machine that]"
  },
  {
    question: "Reweave",
    answer: "(Rewove/Reweaved) (Rewoven/Reweaved) [To weave again]"
  },
  {
    question: "Rewrite",
    answer: "(Rewrote) (Rewritten) [To write something again, usually with]"
  },
  {
    question: "Shortcut",
    answer: "(Shortcut) (Shortcut) [To use a shorter or quicker way of going]"
  },
  {
    question: "somehere",
    answer: "(or) (doing) [something]"
  },
  {
    question: "Sidewind",
    answer: "(Sidewound) (Sidewound) [To move like the sidewinder snake]"
  },
  {
    question: "Sightsee",
    answer: "(Sightsaw) (Sightseen) [To visit famous monuments, etc]"
  },
  {
    question: "Skywrite",
    answer: "(Skywrote) (Skywritten) [To write in the sky with smoke]"
  },
  {
    question: "Soothsay",
    answer: "(Soothsaid) (Soothsaid) [To predict the future]"
  },
  {
    question: "Sunburn",
    answer: "(Sunburned/Sunburnt) (Sunburned/Sunburnt) [To get red skin from being in the sun for too]"
  },
  {
    question: "Telecast",
    answer: "(Telecast/Telecasted) (Telecast/Telecasted) [To broadcast on TV]"
  },
  {
    question: "tricken",
    answer: "(To) (strike) [with lightning]"
  },
  {
    question: "Typecast",
    answer: "(Typecast) (Typecast) [To give an actor the same sort of role]"
  },
  {
    question: "Typeset",
    answer: "(Typeset) (Typeset) [To compose type for printing]"
  },
  {
    question: "Unbuild",
    answer: "(Unbuilt) (Unbuilt) [To demolish]"
  },
  {
    question: "Unclothe",
    answer: "(Unclad/Unclothed) (Unclad/Unclothed) [To remove clothes]"
  },
  {
    question: "Underbid",
    answer: "(Underbid) (Underbid/Underbidden) [To offer less money in an auction or sale]"
  },
  {
    question: "Underbuy",
    answer: "(Underbought) (Underbought) [To buy for less than the real value]"
  },
  {
    question: "Undercut",
    answer: "(Undercut) (Undercut) [To sell at a cheaper price than a competitor]"
  },
  {
    question: "Underdo",
    answer: "(Underdid) (Underdone) [To do less than necessary]"
  },
  {
    question: "Undergo",
    answer: "(Underwent) (Undergone) [To suffer or go through an unpleasant]"
  },
  {
    question: "Underlay",
    answer: "(Underlaid) (Underlaid) [To put underneath something]"
  },
  {
    question: "Underlet",
    answer: "(Underlet) (Underlet) [To rent for less than the real value]"
  },
  {
    question: "Underlie",
    answer: "(Underlay) (Underlain) [To be the real reason, meaning or idea behind]"
  },
  {
    question: "Underpay",
    answer: "(Underpaid) (Underpaid) [To pay someone too little or pay less than the]"
  },
  {
    question: "Underrun",
    answer: "(Underran) (Underrun) [To pass or flow underneath something]"
  },
  {
    question: "Unfreeze",
    answer: "(Unfroze) (Unfrozen) [To make assets availably for use]"
  },
  {
    question: "Unlearn",
    answer: "(Unlearnt/Unlearned) (Unlearnt/Unlearned) [To try to forget or change a habit or]"
  },
  {
    question: "Unreeve",
    answer: "(Unrove/Unreeved) (Unrove/Unreeved) [To remove a rope from a hook]"
  },
  {
    question: "Unsling",
    answer: "(Unslung) (Unslung) [To remove something held in a sling]"
  },
  {
    question: "Unspeak",
    answer: "(Unspoke) (Unspoken) [To take back what has been said or not to say]"
  },
  {
    question: "Unstick",
    answer: "(Unstuck) (Unstuck) [To seperate things that have been stuck]"
  },
  {
    question: "Unstring",
    answer: "(Unstrung) (Unstrung) [To open something secured with string]"
  },
  {
    question: "Unswear",
    answer: "(Unswore) (Unsworn) [To take back an oath]"
  },
  {
    question: "Unteach",
    answer: "(Untaught) (Untaught) [To make someone forget something they]"
  },
  {
    question: "Unthink",
    answer: "(Unthought) (Unthought) [To remove something from your mind]"
  },
  {
    question: "Untread",
    answer: "(Untrod) (Untrodden) [To tread back, retrace your steps]"
  },
  {
    question: "Unweave",
    answer: "(Unwove) (Unwoven) [To undo things that have been woven]"
  },
  {
    question: "Unwrite",
    answer: "(Unwrote) (Unwritten) [To delete writing or not to write]"
  },
  {
    question: "Upbuild",
    answer: "(Upbuilt) (Upbuilt) [To build up, develop on a large scale]"
  },
  {
    question: "Uppercut",
    answer: "(Uppercut) (Uppercut) [To punch upwards towards someone's chin ; To return from the dead]"
  },
  {
    question: "Upspring",
    answer: "(Upsprang) (Upsprung) [To jump or spring up]"
  },
  {
    question: "Upsweep",
    answer: "(Upswept) (Upswept) [To sweep or brush upwards]"
  },
  {
    question: "Whipsaw",
    answer: "(Whipsawed) (Whipsawn/Whipsawed) [To cut with whipsaw (a saw for two people)]"
  },
  {
    question: "Wiredraw",
    answer: "(Wiredrew) (Wiredrawn) [To make wire ; To make something last a long time,]"
  },
  {
    question: "Withdraw",
    answer: "(Withdrew) (Withdrawn) [To remove money from a bank ; To remove something from a place]"
  },
  {
    question: "Withhold",
    answer: "(Withheld) (Withheld) [Not to let somebody have something]"
  },
  {
    question: "Backlight",
    answer: "(Backlit) (Backlit) [To illuminate from behind (photography)]"
  },
  {
    question: "Backslide",
    answer: "(Backslid) (Backslid/Backslidden) [To stop making progress and start regressing]"
  },
  {
    question: "Broadcast",
    answer: "(Broadcast/Broadcasted) (Broadcast/Broadcasted) [To transmit radio or TV signals]"
  },
  {
    question: "Cheerlead",
    answer: "(Cheerled) (Cheerled) [To cheer and support a team in an organised]"
  },
  {
    question: "Colorbreed",
    answer: "(Colorbred) (Colorbred) [To breed an animal to be of a particular color]"
  },
  {
    question: "Colorcast",
    answer: "(Colorcast) (Colorcast) [To broadcast in color]"
  },
  {
    question: "Crossbreed",
    answer: "(Crossbred) (Crossbred) [To breed animals or plants of different]"
  },
  {
    question: "Crosslight",
    answer: "(Crosslit) (Crosslit) [To illuminate from different sides, but not]"
  },
  {
    question: "Floodlight",
    answer: "(Floodlit) (Floodlit) [To use powerful lights to illuminate something]"
  },
  {
    question: "Forespeak",
    answer: "(Forespoke) (Forespoken) [To predict ; To speak of something beforehand]"
  },
  {
    question: "Frostbite",
    answer: "(Frostbit) (Frostbitten) [To injure or damage part of the body through]"
  },
  {
    question: "Ghostwrite",
    answer: "(Ghostwrote) (Ghostwritten) [To write for someone else, who will put their]"
  },
  {
    question: "Handwrite",
    answer: "(Handwrote) (Handwritten) [To write with a pen or pencil rather than a]"
  },
  {
    question: "Housebreak",
    answer: "(Housebroke) (Housebroken) [To train an animal to live in a house]"
  },
  {
    question: "Interbreed",
    answer: "(Interbred) (Interbred) [To mix species or groups sexually]"
  },
  {
    question: "Intergrave",
    answer: "(Intergraved) (Intergraved/Intergraven) [To carve or engrave in alternate sections]"
  },
  {
    question: "Interweave",
    answer: "(Interwove) (Interwoven) [To join or mix together]"
  },
  {
    question: "Interwind",
    answer: "(Interwound) (Interwound) [To wind together or intertwine]"
  },
  {
    question: "Landslide",
    answer: "(Landslid/Landslided) (Landslid/Landslided) [To win a convincing and easy victory in an]"
  },
  {
    question: "Linebreed",
    answer: "(Linebred) (Linebred) [Breed animals from a particular family]"
  },
  {
    question: "movements",
    answer: "(of) (their) [mouth]"
  },
  {
    question: "Misbecome",
    answer: "(Misbecame) (Misbecome) [Not to suit]"
  },
  {
    question: "Mischoose",
    answer: "(Mischose) (Mischosen) [To choose wrongly]"
  },
  {
    question: "Outspring",
    answer: "(Outsprang) (Outsprung) [To spring or jump out]"
  },
  {
    question: "Overbreed",
    answer: "(Overbred) (Overbred) [To breed too much so that features become]"
  },
  {
    question: "Overbuild",
    answer: "(Overbuilt) (Overbuilt) [To build too much, overdevelop]"
  },
  {
    question: "Overdrink",
    answer: "(Overdrank) (Overdrunk) [To drink too much]"
  },
  {
    question: "Overdrive",
    answer: "(Overdrove) (Overdriven) [To drive or work something too hard]"
  },
  {
    question: "Overlearn",
    answer: "(Overlearnt/Overlearned) (Overlearnt/Overlearned) [To continue learning afer having reached a]"
  },
  {
    question: "Overshoot",
    answer: "(Overshot) (Overshot) [To go past a limit]"
  },
  {
    question: "Oversleep",
    answer: "(Overslept) (Overslept) [To sleep too late]"
  },
  {
    question: "Overspeak",
    answer: "(Overspoke) (Overspoken) [To speak too long or use too many words]"
  },
  {
    question: "Overspend",
    answer: "(Overspent) (Overspent) [To spend more than allowed or budgeted]"
  },
  {
    question: "Overspill",
    answer: "(Overspilt/Overspilled) (Overspilt/Overspilled) [To spill over ; To have a population that exceeds the space]"
  },
  {
    question: "Overspread",
    answer: "(Overspread) (Overspread) [To cover something]"
  },
  {
    question: "Overspring",
    answer: "(Oversprang) (Oversprung) [To jump over]"
  },
  {
    question: "Overstand",
    answer: "(Overstood) (Overstood) [Lose a sale of deal by sticking to a price or]"
  },
  {
    question: "conditions",
    answer: "(unacceptable) (to) [the other party]"
  },
  {
    question: "Overstrew",
    answer: "(Overstrewed) (Overstrewed/Overstrewn) [To sprinkle or strew something onto another]"
  },
  {
    question: "Overstride",
    answer: "(Overstrode) (Overstridden) [To walk across or over ; To walk faster than someone]"
  },
  {
    question: "Overstrike",
    answer: "(Overstruck) (Overstruck) [To stamp a new value or inscription on a old]"
  },
  {
    question: "Overstring",
    answer: "(Overstrung) (Overstrung) [To tie a string too tightly ; To string piano bass strings across treble]"
  },
  {
    question: "Overthink",
    answer: "(Overthought) (Overthought) [To think or plan too much]"
  },
  {
    question: "Overthrow",
    answer: "(Overthrew) (Overthrown) [To remove someone forcibly from government]"
  },
  {
    question: "Overwrite",
    answer: "(Overwrote) (Overwritten) [To record data on top of existing data, erasing]"
  },
  {
    question: "especially",
    answer: "(when) (a) [hit is needed]"
  },
  {
    question: "Preshrink",
    answer: "(Preshrank) (Preshrunk) [To shrink a fabric before selling it so that it]"
  },
  {
    question: "Proofread",
    answer: "(Proofread) (Proofread) [To read something checking carefully for]"
  },
  {
    question: "Roughcast",
    answer: "(Roughcast) (Roughcast) [To prepare a rough form of something]"
  },
  {
    question: "Snapshoot",
    answer: "(Snapshot) (Snapshot) [Take a quick photograph]"
  },
  {
    question: "Spellbind",
    answer: "(Spellbound) (Spellbound) [To put into a trance or captivate]"
  },
  {
    question: "Spoonfeed",
    answer: "(Spoonfed) (Spoonfed) [To give someone information in small and]"
  },
  {
    question: "Straphang",
    answer: "(Straphung) (Straphung) [To hold a strap for support]"
  },
  {
    question: "Typewrite",
    answer: "(Typewrote) (Typewritten) [To write with a typewriter]"
  },
  {
    question: "Underfeed",
    answer: "(Underfed) (Underfed) [To give too little food to someone or an]"
  },
  {
    question: "Undergird",
    answer: "(Undergirt/Undergirded) (Undergirt/Undergirded) [To make something secure underneath ; To give moral support]"
  },
  {
    question: "Undersell",
    answer: "(Undersold) (Undersold) [To sell at a lower price than a competitor]"
  },
  {
    question: "Undershoot",
    answer: "(Undershot) (Undershot) [To shoot too short]"
  },
  {
    question: "Underspend",
    answer: "(Underspent) (Underspent) [To sepnd less money than allocated in the]"
  },
  {
    question: "Understand",
    answer: "(Understood) (Understood) [To know or come to know the meaning of]"
  },
  {
    question: "Undertake",
    answer: "(Undertook) (Undertaken) [To accept responsibility for doing something]"
  },
  {
    question: "Underwrite",
    answer: "(Underwrote) (Underwritten) [To accept part or all of a financial risk,]"
  },
  {
    question: "something",
    answer: "(that) (had) [been learned]"
  },
  {
    question: "Winterfeed",
    answer: "(Winterfed) (Winterfed) [To feed cattle in the winter when they can't]"
  },
  {
    question: "Withstand",
    answer: "(Withstood) (Withstood) [To resist successfully]"
  },
  {
    question: "Counterdraw",
    answer: "(Counterdrew) (Counterdrawn) [To copy by tracing]"
  },
  {
    question: "Counterlight",
    answer: "(Counterlit) (Counterlit) [To light something directly from opposite]"
  },
  {
    question: "Halterbreak",
    answer: "(Halterbroke) (Halterbroken) [To break a horse in, to get it used to wearing]"
  },
  {
    question: "Misunderstand",
    answer: "(Misunderstood) (Misunderstood) [Not to understand]"
  },
  {
    question: "Overwithhold",
    answer: "(Overwithheld) (Overwithheld) [To deduct too much tax from a payment or]"
  },
  {
    question: "Rebroadcast",
    answer: "(Rebroadcast) (Rebroadcast) [To transmit something on televison or the]"
  },
  {
    question: "Troubleshoot",
    answer: "(Troubleshot) (Troubleshot) [To solve a problem]"
  },
  {
    question: "Underthrust",
    answer: "(Underthrust) (Underthrust) [To insert faulted rock under a passive rock]"
  }
];

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TIMER") {
    const minutes = message.minutes
    const endTime = Date.now() + minutes * 60 * 1000

    const intervalSeconds = 60  // 👈 X tiempo
    const intervalMinutes = intervalSeconds / 60


    chrome.storage.local.set({
      endTime,
      lastMinutes: minutes,
      intervalSeconds
    })

    chrome.alarms.create("timerAlarm", {
      periodInMinutes: intervalMinutes
    })
  }

  if (message.type === "STOP_TIMER") {
    chrome.alarms.clear("timerAlarm")
    chrome.storage.local.remove("endTime")
    chrome.notifications.clearAll?.() // opcional
    console.log("Timer detenido")
  }
})

let sessionActive = false

// Crear alarmas al iniciar la extensión
chrome.runtime.onInstalled.addListener(() => {
  createAlarms()
})

chrome.runtime.onStartup.addListener(() => {
  createAlarms()
})

function createAlarms() {
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: 1
  })
  const minutes = 1
  const endTime = Date.now() + minutes * 60 * 1000

  const intervalSeconds = 30  // 👈 X tiempo
  const intervalMinutes = intervalSeconds / 60

  chrome.storage.local.set({
    endTime,
    lastMinutes: minutes,
    intervalSeconds
  })

  chrome.alarms.create("notificationAlarm", {
    periodInMinutes: intervalMinutes
  })
}


// Listener global de alarmas
chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "sessionAlarm") {
    checkSessionTime()
  }

  if (alarm.name === "notificationAlarm") {
    if (sessionActive) {
      console.log("sending notification")
      sendNotification()
    }
  }
})


// 🔐 Control de sesión (ej: 18:00 inicia, 19:00 termina)
function checkSessionTime() {
  const now = new Date()
  const hour = now.getHours()

  // Inicia sesión a las 18:00
  if (hour === 15 && !sessionActive) {
    sessionActive = true
  }

  // Termina sesión a las 19:00
  if (hour === 16 && sessionActive) {
    sessionActive = false
  }
}


// 🔔 Notificación periódica
function sendNotification() {
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

  chrome.notifications.create("flashCard_" + Date.now(), {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.png"),
    title: randomQuestion.question,
    message: randomQuestion.answer,
    buttons: [{ title: "Review Later" }, {title: "Answered Correctly"} ],
    priority: 2,
    silent: true,
    requireInteraction: true,
  }, (id) => {
    setTimeout(() => {
      chrome.notifications.clear(id);
    }, 30000);
  });
}


// 🛑 Detener manualmente sesión
function stopSessionManually() {
  sessionActive = false
  chrome.notifications.clearAll?.()
  console.log("Sesión detenida manualmente")
}


// chrome.alarms.onAlarm.addListener((alarm) => {
//   console.log("Alarm triggered:", alarm.name)
//   const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

//   if (alarm.name === "timerAlarm") {
//     chrome.notifications.create("timerFinished_" + Date.now(), {
//       type: "basic",
//       iconUrl: chrome.runtime.getURL("icon.png"),
//       title: randomQuestion.question,
//       message: randomQuestion.answer,
//       buttons: [{ title: "Repeat Cycle" }],
//       priority: 2,
//       silent: true,
//       requireInteraction: true,
//     }, (id) => {
//       setTimeout(() => {
//         chrome.notifications.clear(id);
//       }, 30000);
//     });
//   }
// })

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "timerFinished" && buttonIndex === 0) {
    chrome.storage.local.get("lastMinutes", (data) => {
      const minutes = data.lastMinutes
      const endTime = Date.now() + minutes * 60 * 1000

      chrome.storage.local.set({
        endTime,
        lastMinutes: minutes
      })

      chrome.alarms.create("timerAlarm", {
        when: endTime
      })
    })
  }
})