async(page)=>{
 const results=[];
 await page.setViewportSize({width:402,height:874});
 for(const [goal,title] of [['Become a better grower','Become a better grower'],['Grow healthier plants','Grow healthier plants'],['Improve my grow’s quality','Improve your grow’s quality'],['Keep my grow organized','Keep your grow organized'],['Not sure yet — let me explore','Find your growing goal']]){
  await page.goto('http://127.0.0.1:3011/review/screen?screen=intent');
  await page.getByRole('button',{name:goal,exact:false}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Not sure yet',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Not sure yet',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('heading',{name:title,exact:true}).waitFor();
  if(await page.getByText('Not sure yet',{exact:true}).count()<2)throw Error('Unknown answers lost');
  results.push(goal);
 }
 await page.screenshot({path:'output/playwright/V7MasterGrowbotUndecidedSummary.png'});
 await page.goto('http://127.0.0.1:3011/review/screen?screen=intent');await page.screenshot({path:'output/playwright/V7MasterGrowbotGoalQuiz.png'});
 return {goals:results,summaryUsesAnswers:true};
}
