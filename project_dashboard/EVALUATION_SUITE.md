============================================================
AI ANALYST — COMPREHENSIVE QUESTION TEST & EVALUATION SUITE
============================================================

IMPORTANT:

These are NOT examples for the model to memorize.

They are TEST CASES.

For every question below, the system MUST:

1. Understand the user's intent.
2. Identify the required dataset(s).
3. Identify the required metric.
4. Identify the required aggregation.
5. Apply the current dashboard filters.
6. Query the REAL database/dataset.
7. Perform the calculation deterministically.
8. Return structured evidence.
9. Give that evidence to xAI/Grok.
10. Let Grok explain the result.
11. NEVER invent the numerical answer.

DO NOT hardcode answers for these questions.

The same question must continue to work if the dataset changes.

============================================================
A. DATASET OVERVIEW QUESTIONS
============================================================

1. How many mandis are in the dataset?
2. How many states are covered?
3. Which states are covered?
4. How many districts are covered?
5. How many crops are available?
6. Which crops are available?
7. How many varieties are available?
8. What is the total arrival quantity?
9. What is the average arrival quantity?
10. What is the earliest date in the dataset?
11. What is the latest date in the dataset?
12. How many arrival records are there?
13. How many logistics records are there?
14. How many price records are there?
15. How many weather records are there?
16. Give me an overview of the dataset.
17. What data is available for analysis?
18. What metrics can I analyze?
19. Which datasets are connected to the dashboard?
20. What is the overall average modal price?

============================================================
B. ARRIVAL ANALYSIS
============================================================

21. What is the total crop arrival volume?
22. What is the average daily arrival volume?
23. What is the maximum daily arrival volume?
24. What day had the highest arrivals?
25. What day had the lowest arrivals?
26. Show daily arrivals.
27. Show me the arrival trend over time.
28. Which month had the highest arrivals?
29. Which month had the lowest arrivals?
30. Which state has the highest total arrivals?
31. Which state has the lowest total arrivals?
32. What are the total arrivals in Punjab?
33. What are the total arrivals in Haryana?
34. What are the total arrivals in Uttar Pradesh?
35. Compare arrivals across all states.
36. Show the top 5 states by arrivals.
37. Show the top 10 mandis by arrivals.
38. Which mandi has the highest arrivals?
39. Which mandi has the lowest arrivals?
40. What is the average arrival volume per mandi?
41. Which district has the highest arrivals?
42. Which district has the lowest arrivals?
43. Show arrivals by district.
44. Show arrivals by mandi.
45. Show arrivals by crop.
46. Show arrivals by variety.
47. Which crop has the highest arrivals?
48. Which crop has the lowest arrivals?
49. Show the top 5 crops by arrivals.
50. Show the bottom 5 crops by arrivals.

============================================================
C. STATE-SPECIFIC ARRIVAL QUESTIONS
============================================================

51. How much wheat arrived in Punjab?
52. How much rice arrived in Punjab?
53. How much maize arrived in Punjab?
54. How much cotton arrived in Punjab?
55. How much mustard arrived in Punjab?
56. How much sugarcane arrived in Punjab?

57. How much wheat arrived in Haryana?
58. How much rice arrived in Haryana?
59. How much maize arrived in Haryana?
60. How much cotton arrived in Haryana?
61. How much mustard arrived in Haryana?
62. How much sugarcane arrived in Haryana?

63. How much wheat arrived in Uttar Pradesh?
64. How much rice arrived in Uttar Pradesh?
65. How much maize arrived in Uttar Pradesh?
66. How much cotton arrived in Uttar Pradesh?
67. How much mustard arrived in Uttar Pradesh?
68. How much sugarcane arrived in Uttar Pradesh?

69. Which crop has the highest arrivals in Punjab?
70. Which crop has the highest arrivals in Haryana?
71. Which crop has the highest arrivals in Uttar Pradesh?

72. Show the crop distribution for Punjab.
73. Show the crop distribution for Haryana.
74. Show the crop distribution for Uttar Pradesh.

============================================================
D. CROP ANALYSIS
============================================================

75. Which crop has the highest total arrivals?
76. Which crop has the lowest total arrivals?
77. What are the total wheat arrivals?
78. What are the total rice arrivals?
79. What are the total maize arrivals?
80. What are the total cotton arrivals?
81. What are the total mustard arrivals?
82. What are the total sugarcane arrivals?

83. What is the average arrival quantity for wheat?
84. What is the average arrival quantity for rice?
85. What is the average arrival quantity for maize?
86. What is the average arrival quantity for cotton?
87. What is the average arrival quantity for mustard?
88. What is the average arrival quantity for sugarcane?

89. Which crop has the highest average daily arrivals?
90. Which crop has the most mandis handling it?
91. Which crop has the most varieties?
92. Show the top 5 crops by total arrival volume.
93. Compare wheat and rice arrivals.
94. Compare wheat and maize arrivals.
95. Compare rice and maize arrivals.
96. Compare cotton and mustard arrivals.
97. Which crop contributes the largest percentage of total arrivals?

============================================================
E. MANDI ANALYSIS
============================================================

98. Which mandi has the highest arrivals?
99. Which mandi has the lowest arrivals?
100. Show the top 5 mandis by arrivals.
101. Show the top 10 mandis by arrivals.
102. Show the bottom 5 mandis by arrivals.
103. What is the average arrival volume per mandi?
104. Which mandis handle wheat?
105. Which mandis handle rice?
106. Which mandi handles the most different crops?
107. Which mandi handles the most varieties?
108. Show the arrival volume of each mandi.
109. Compare two mandis.
110. What is the busiest mandi?
111. Which mandi contributes the most to total arrivals?

============================================================
F. PRICE ANALYSIS
============================================================

112. What is the average modal price?
113. What is the average MSP?
114. What is the highest modal price?
115. What is the lowest modal price?
116. Which crop has the highest average modal price?
117. Which crop has the lowest average modal price?
118. Which state has the highest average modal price?
119. Which state has the lowest average modal price?
120. Which mandi has the highest average modal price?
121. Which mandi has the lowest average modal price?
122. Show modal price versus MSP.
123. Show the average modal price versus average MSP.
124. Which crops are trading above MSP?
125. Which crops are trading below MSP?
126. How much higher is modal price than MSP?
127. What is the average price difference between modal price and MSP?
128. Show the price trend over time.
129. Which date had the highest modal price?
130. Which date had the lowest modal price?

============================================================
G. PRICE CRASH ANALYSIS
============================================================

131. How many price crashes occurred?
132. What is the price crash rate?
133. Which crop has the highest price crash rate?
134. Which crop has the lowest price crash rate?
135. Which state has the highest price crash rate?
136. Which state has the lowest price crash rate?
137. Which mandi has the highest price crash rate?
138. Show the top 5 crops by price crash rate.
139. Show the top 5 mandis by price crash rate.
140. On which dates did price crashes occur?
141. What percentage of observations were below MSP?
142. Which crops are most frequently below MSP?
143. Compare price crashes between Punjab and Haryana.
144. Compare price crashes between wheat and rice.
145. Show price crash instances over time.

IMPORTANT:
Price crash MUST be defined consistently as:

modal_price < MSP

Do not invent another definition.

============================================================
H. LOGISTICS ANALYSIS
============================================================

146. What is the average transit time?
147. What is the maximum transit time?
148. What is the minimum transit time?
149. How many shipments were delayed?
150. What is the overall transit delay rate?
151. Which mandi has the highest transit delay rate?
152. Which mandi has the lowest transit delay rate?
153. Show the top 5 mandis by transit delay rate.
154. Show the bottom 5 mandis by transit delay rate.
155. Which warehouse has the highest transit delay rate?
156. Which warehouse has the lowest transit delay rate?
157. Show the top 5 warehouses by delay rate.
158. Which warehouse has the longest average transit time?
159. Which warehouse has the shortest average transit time?
160. What is the average transit time by warehouse?
161. What is the average transit time by mandi?
162. What is the average transit time by state?
163. Which state has the highest transit delay rate?
164. Which state has the lowest transit delay rate?
165. Compare transit delays across states.
166. Compare Punjab and Haryana transit delays.
167. Which crop has the highest transit delay rate?
168. Which crop has the lowest transit delay rate?
169. What is the average logistics distance?
170. Which route has the longest distance?
171. Which route has the shortest distance?
172. Is transit time higher for any particular crop?
173. Show transit time distribution.
174. Show delayed versus non-delayed shipments.

============================================================
I. TRANSIT DELAY DEFINITION TESTS
============================================================

175. What counts as a transit delay?
176. How is transit delay calculated?
177. How many records exceed the delay threshold?
178. What percentage of records exceed the delay threshold?
179. Which mandi has the highest number of delayed shipments?
180. Which mandi has the highest delay percentage?
181. Are highest delayed shipment count and highest delay rate the same mandi?
182. Show both delayed shipment count and delay rate for the top mandis.

IMPORTANT:
Do NOT confuse:

DELAY COUNT
with
DELAY RATE

Delay count:
number of delayed records

Delay rate:
delayed records / total records × 100

============================================================
J. WEATHER ANALYSIS
============================================================

183. What is the average rainfall?
184. What is the maximum rainfall?
185. What is the minimum rainfall?
186. What is the average temperature?
187. What is the average humidity?
188. What is the correlation between rainfall and arrivals?
189. Is rainfall correlated with arrival volume?
190. Show rainfall versus arrivals.
191. Which district has the highest rainfall?
192. Which district has the lowest rainfall?
193. Which state has the highest average rainfall?
194. Which state has the lowest average rainfall?
195. Which crop has the highest arrivals during high rainfall?
196. What happens to arrivals when rainfall increases?
197. Compare rainfall and arrivals across states.
198. Show weather trends over time.
199. What is the temperature-arrival correlation?
200. What is the humidity-arrival correlation?

IMPORTANT:

Correlation ≠ causation.

The assistant must say:

"Rainfall is correlated with arrivals at X"

NOT:

"Rainfall caused arrivals to increase/decrease."

============================================================
K. DATE AND TIME FILTER TESTS
============================================================

201. What were arrivals on January 1?
202. What were arrivals on January 5?
203. What were arrivals in January?
204. What were arrivals in February?
205. What were arrivals in March?
206. What were arrivals in April?
207. What were arrivals in May?
208. What were arrivals in June?
209. What were arrivals in July?
210. What were arrivals in August?
211. What were arrivals in September?
212. What were arrivals in October?
213. What were arrivals in November?
214. What were arrivals in December?
215. Which month had the highest arrivals?
216. Which month had the lowest arrivals?
217. What was the highest arrival day?
218. What was the lowest arrival day?
219. Show daily arrivals between January and March.
220. Show daily arrivals for the selected date range.

============================================================
L. FILTER TESTS
============================================================

221. Show arrivals for Punjab.
222. Show arrivals for Haryana.
223. Show arrivals for Uttar Pradesh.

224. Show wheat arrivals in Punjab.
225. Show wheat arrivals in Haryana.
226. Show rice arrivals in Punjab.
227. Show maize arrivals in Haryana.

228. Show arrivals for a specific mandi.
229. Show prices for a specific mandi.
230. Show logistics for a specific mandi.
231. Show weather for a specific district.

232. Show wheat arrivals between January and March.
233. Show Punjab arrivals between January and March.
234. Show wheat arrivals in Punjab between January and March.
235. Show logistics for Punjab between January and March.
236. Show price crashes for wheat in Punjab.
237. Show transit delays for wheat in Punjab.

============================================================
M. MULTI-FILTER TESTS
============================================================

238. Which mandi has the highest arrivals in Punjab for wheat?
239. Which mandi has the highest transit delay in Punjab for wheat?
240. Which mandi has the highest modal price for wheat in Punjab?
241. Which mandi has the highest price crash rate for wheat in Punjab?
242. What is the average transit time for wheat in Punjab?
243. What are the total wheat arrivals in Punjab?
244. What is the average modal price for wheat in Punjab?
245. What is the price crash rate for wheat in Punjab?
246. What is the rainfall-arrival correlation for Punjab?
247. Show the top 5 wheat mandis in Punjab by arrivals.

============================================================
N. STATE COMPARISON QUESTIONS
============================================================

248. Compare Punjab and Haryana.
249. Compare Punjab and Uttar Pradesh.
250. Compare Haryana and Uttar Pradesh.
251. Compare all three states.
252. Which state has higher arrivals: Punjab or Haryana?
253. Compare their average modal prices.
254. Compare their price crash rates.
255. Compare their transit delay rates.
256. Compare their average transit times.
257. Compare their rainfall.
258. Compare their crop distributions.
259. Compare wheat arrivals between Punjab and Haryana.
260. Compare rice arrivals between Punjab and Haryana.
261. Compare logistics performance across all states.

IMPORTANT:
For comparison questions, calculate BOTH sides from the database using the same metric and scope.

============================================================
O. CROP COMPARISON QUESTIONS
============================================================

262. Compare wheat and rice.
263. Compare wheat and maize.
264. Compare rice and maize.
265. Compare cotton and mustard.
266. Compare mustard and sugarcane.
267. Compare all crops.
268. Compare wheat and rice arrivals.
269. Compare wheat and rice modal prices.
270. Compare wheat and rice MSP.
271. Compare wheat and rice price crash rates.
272. Compare wheat and rice transit times.
273. Compare wheat and rice delay rates.

============================================================
P. TOP / BOTTOM RANKING QUESTIONS
============================================================

274. Top 5 mandis by arrivals.
275. Top 10 mandis by arrivals.
276. Bottom 5 mandis by arrivals.

277. Top 5 crops by arrivals.
278. Bottom 5 crops by arrivals.

279. Top 5 mandis by modal price.
280. Bottom 5 mandis by modal price.

281. Top 5 crops by modal price.
282. Bottom 5 crops by modal price.

283. Top 5 mandis by transit delay.
284. Bottom 5 mandis by transit delay.

285. Top 5 warehouses by delay rate.
286. Bottom 5 warehouses by delay rate.

287. Top 5 crops by price crash rate.
288. Bottom 5 crops by price crash rate.

IMPORTANT:
Ranking MUST be performed by code/database.

Grok must NOT decide rankings itself.

============================================================
Q. NATURAL LANGUAGE VARIATIONS
============================================================

The system must understand different ways of asking the SAME question.

Test:

289. Which mandi has the worst transit delay?
290. Which mandi is facing the highest transit delays?
291. Where are transit delays the highest?
292. Which mandi takes the longest to transport goods?
293. Which mandi has the highest delay percentage?
294. Tell me the mandi with maximum transit delay.
295. Give me the worst performing mandi for transit time.
296. Find the mandi with the highest logistics delay.
297. Which mandi has the most delayed shipments?
298. Which mandi experiences the greatest transportation delay?

These questions must NOT be interpreted as ten unrelated concepts.

The system must determine whether the user means:

- delay rate
- delay count
- average transit time

and use the wording appropriately.

If ambiguous, ask a clarification question instead of guessing.

============================================================
R. FOLLOW-UP QUESTIONS
============================================================

The assistant must maintain conversation context.

Example:

User:
Which mandi has the highest arrivals?

Assistant:
XYZ Mandi.

User:
What about its transit delay?

The system should understand:

"its" = XYZ Mandi

and query the logistics data for XYZ Mandi.

Test:

299. Which mandi has the highest arrivals?
300. What is its transit delay?
301. What is its average modal price?
302. How many crops does it handle?
303. Which crop contributes most to its arrivals?

Another conversation:

304. Which crop has the highest arrivals?
305. What is its average modal price?
306. What is its price crash rate?
307. Which state has the most of it?

============================================================
S. "WHY" QUESTIONS
============================================================

308. Why are arrivals high in Punjab?
309. Why did arrivals decrease?
310. Why are transit delays high?
311. Why are prices below MSP?
312. Why are price crashes occurring?
313. Why is rainfall associated with arrival changes?
314. Why is this mandi experiencing delays?

IMPORTANT:

For "why" questions:

DO NOT invent causal explanations.

Use available evidence only.

For example:

- arrival trends
- price data
- logistics data
- rainfall
- temperature
- humidity

If the dataset does not establish causality, say:

"The dataset shows an association, but it does not establish causation."

============================================================
T. TREND QUESTIONS
============================================================

315. Are arrivals increasing or decreasing?
316. How have arrivals changed over time?
317. How have prices changed over time?
318. How have transit times changed over time?
319. How has rainfall changed over time?
320. Which month showed the biggest arrival change?
321. Which month showed the biggest price change?
322. Which month had the highest transit delay?
323. Show the arrival trend for wheat.
324. Show the arrival trend for Punjab.
325. Show the price trend for wheat.
326. Show the logistics trend for Punjab.

============================================================
U. BUSINESS / DECISION QUESTIONS
============================================================

327. Which mandi has the largest arrival volume?
328. Which mandi has the highest logistics delay?
329. Which crop has the greatest price risk?
330. Which state has the highest arrival volume?
331. Which crops are most frequently below MSP?
332. Which warehouses have the highest delays?
333. Which crops have both high arrivals and high price crash rates?
334. Which mandis have high arrivals and high transit delays?
335. Which state has high arrivals but low transit delays?
336. Which crops have high arrivals but frequent price crashes?

IMPORTANT:

These are multi-metric analytical questions.

They MUST be calculated from the actual data.

Do not let Grok make unsupported business recommendations.

============================================================
V. CROSS-DATASET QUESTIONS
============================================================

337. Which mandi has high arrivals and high transit delays?
338. Which crop has the highest arrivals and lowest average price?
339. Which state has the highest arrivals and highest price crash rate?
340. Which crop has high arrivals but is frequently below MSP?
341. Which state has the highest rainfall and what are its arrivals?
342. Which crop has the highest arrivals during high rainfall?
343. Which mandi has high arrivals but low transit time?
344. Which warehouse handles the most delayed shipments?
345. Compare arrival volume and transit delay by state.
346. Compare arrival volume and price crash rate by crop.

============================================================
W. EDGE CASE QUESTIONS
============================================================

347. What happens if there are no records for my selected filters?
348. What happens if I select a mandi with no logistics records?
349. What happens if I select a crop with no weather data?
350. What happens if the selected date range has no records?
351. What happens if I select an invalid date range?
352. What happens if I ask for a mandi that does not exist?
353. What happens if I ask for a crop that does not exist?
354. What happens if I ask for a state that does not exist?
355. What happens if data is missing?
356. Can you calculate this if some records have missing values?

Expected behavior:

NEVER fabricate.

Return:

"No records match the current filters."

or:

"There isn't enough data to calculate this metric for the selected scope."

============================================================
X. AMBIGUOUS QUESTIONS
============================================================

The system should recognize ambiguity.

357. Which mandi is worst?
358. Which crop is best?
359. Which state performs best?
360. Which mandi is most efficient?
361. Which crop is risky?
362. Which state has better prices?
363. Which mandi has the highest delay?

For ambiguous questions, determine whether the user has specified a metric.

If not, ASK:

"What metric would you like me to use — arrivals, price, transit time, or delay rate?"

Do NOT arbitrarily choose a metric.

============================================================
Y. CHART REQUESTS
============================================================

364. Show me the top 5 mandis by arrivals.
365. Plot daily arrivals.
366. Plot arrivals by state.
367. Plot arrivals by crop.
368. Plot modal price versus MSP.
369. Plot transit delay rates by mandi.
370. Plot transit delay rates by state.
371. Plot rainfall versus arrivals.
372. Plot price crashes over time.
373. Show the top 5 crops.
374. Show the top 10 mandis.
375. Show the arrival trend for Punjab.
376. Show the arrival trend for wheat.

IMPORTANT:

Charts MUST use the exact same analytics result used for the text answer.

No fake chart data.

============================================================
Z. FILTER-AWARE QUESTIONS
============================================================

Test the chatbot while changing dashboard filters.

Scenario 1:

State = Punjab
Crop = Wheat

Question:
Which mandi has the highest transit delay?

Scenario 2:

State = Haryana
Crop = Wheat

Same question.

Scenario 3:

State = Uttar Pradesh
Crop = Rice

Same question.

Scenario 4:

State = All
Crop = Wheat

Same question.

Scenario 5:

State = Punjab
Crop = All

Same question.

Scenario 6:

State = All
Crop = All

Same question.

The answers may differ.

The assistant MUST NOT reuse a previous answer.

============================================================
AA. ANTI-CONTEXT-CONTAMINATION TESTS
============================================================

These tests are extremely important.

Ask:

377. Which mandi has the highest arrivals?

Then immediately ask:

378. Which mandi has the highest transit delay?

The second answer MUST NOT reuse the first mandi unless the actual data calculation produces the same result.

Then:

379. Which crop has the highest arrivals?

Then:

380. Which crop has the highest price crash rate?

Again, independently calculate both.

The assistant must NEVER assume:

highest arrivals = highest delay
highest arrivals = highest price risk
highest price = lowest price crash

unless the data actually proves it.

============================================================
AB. NUMBER ACCURACY TESTS
============================================================

For every numerical answer, return:

- metric
- value
- unit
- number of records analyzed
- active filters
- dataset used

Example:

Metric:
Transit Delay Rate

Value:
XX.XX%

Records:
XXX

Filters:
Punjab / Wheat / selected date range

Dataset:
Transport Logistics

This makes every answer auditable.

============================================================
AC. SOURCE DATA TEST
============================================================

Every answer should internally identify the dataset(s) used.

Examples:

Arrival question:
mandi_arrivals

Price question:
price_msp

Logistics question:
transport_logistics

Weather question:
weather_sensors

Mandi metadata:
mandi_master

Cross-dataset question:
multiple relevant datasets

Do NOT use the wrong dataset simply because it contains a similar column.

============================================================
AD. ANSWER FORMAT
============================================================

For analytical questions use:

### Result

[Direct answer]

### Evidence

- Metric: ...
- Value: ...
- Records analyzed: ...
- Dataset: ...

### Scope

- State: ...
- District: ...
- Mandi: ...
- Crop: ...
- Variety: ...
- Date range: ...

### Interpretation

[Short explanation]

Do not overwhelm the user with unnecessary information.

============================================================
AE. CRITICAL FAILURE CONDITIONS
============================================================

The test FAILS if the AI:

- invents numbers
- guesses numbers
- uses old conversation numbers
- returns generic overview statistics
- ignores active filters
- calculates rankings using LLM reasoning
- confuses mandi and warehouse
- confuses delay count and delay rate
- confuses transit time and delay rate
- confuses MSP and modal price
- claims correlation is causation
- uses a different metric than requested
- uses the wrong dataset
- generates fake chart values
- answers from memory
- gives a plausible answer without querying data
- silently changes the date range
- silently removes a filter
- reuses a previous answer
- fabricates missing data

============================================================
AF. REQUIRED INTERNAL TRACE
============================================================

For every test question during development, log:

{
  "user_question": "...",
  "intent": "...",
  "metric": "...",
  "dimension": "...",
  "operation": "...",
  "datasets": [...],
  "filters": {...},
  "records_analyzed": 0,
  "analytics_result": {...},
  "xai_called": true,
  "final_answer": "..."
}

DO NOT expose this debug trace to normal users.

============================================================
AG. AUTOMATED REGRESSION TESTING
============================================================

Create a test suite containing ALL questions above.

For each question verify:

PASS if:

1. Correct intent is detected.
2. Correct dataset is selected.
3. Correct filters are applied.
4. Correct calculation is executed.
5. Result comes from real data.
6. Grok receives the result.
7. Final response does not contradict the calculated result.

FAIL otherwise.

The test suite should be runnable whenever the AI Analyst code changes.

============================================================
AH. FINAL GOLDEN RULE
============================================================

The AI Analyst is NOT a chatbot that knows my dataset.

It is a conversational interface to my ANALYTICS ENGINE.

Therefore:

USER
↓
UNDERSTAND QUESTION
↓
SELECT ANALYTICS OPERATION
↓
QUERY DATABASE
↓
CALCULATE RESULT
↓
VERIFY RESULT
↓
SEND RESULT TO GROK
↓
GROK EXPLAINS
↓
USER

NEVER:

USER
↓
GROK
↓
GUESS
↓
RANDOM ANSWER

If the database cannot provide the answer:

SAY SO.

Never make something up.
