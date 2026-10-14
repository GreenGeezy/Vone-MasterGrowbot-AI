async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await context.addInitScript(()=>{
    localStorage.setItem('mg_onboarding_status','completed');
    localStorage.setItem('mastergrowbot_profile',JSON.stringify({experience:'Novice',isOnboarded:true,hasSeenTutorial:false,onboardingIntent:'explore'}));
  });
  const mobile=await context.newPage();const errors=[];mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://127.0.0.1:3011/');
  await mobile.getByRole('heading',{name:'Your grow overview'}).waitFor();
  await mobile.getByRole('navigation',{name:'Grow overview'}).waitFor();
  await mobile.screenshot({path:'output/playwright/V11MasterGrowbotHome.png'});
  await mobile.getByRole('button',{name:'Journal',exact:true}).click();
  await mobile.getByRole('heading',{name:'Journal',exact:true}).waitFor();
  if(await mobile.locator('.premium-context-card').count())throw Error('Journal must not advertise Premium');
  await mobile.getByRole('button',{name:'Plant Health',exact:true}).click();
  await mobile.getByRole('heading',{name:'Plant Health',exact:true}).waitFor();
  await mobile.getByText('Generic',{exact:true}).click();
  const search=mobile.getByPlaceholder('Search Strains...');await search.waitFor();
  const size=await search.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  if(size<16)throw Error('Strain input can trigger iOS focus zoom');
  await search.fill('');await mobile.getByRole('button',{name:'\u2728 Generic',exact:true}).click();
  if(await search.count())throw Error('Strain selection did not close');
  if(await mobile.evaluate(()=>visualViewport.scale!==1 || document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile viewport enlarged or overflowed');
  await mobile.getByRole('button',{name:'Profile',exact:true}).click();
  await mobile.getByText('View Tutorial',{exact:true}).click();
  for(const title of ['Turn a photo into next checks.','Build your grow record.','Get to know your strain.','Invite a second look.']) {
    await mobile.getByRole('heading',{name:title,exact:true}).waitFor();
    if(title==='Turn a photo into next checks.')await mobile.screenshot({path:'output/playwright/V11MasterGrowbotTutorial.png'});
    await mobile.getByRole('button',{name:title==='Invite a second look.'?'Open my dashboard':'Next',exact:true}).click();
  }
  await mobile.getByRole('heading',{name:'Your grow overview'}).waitFor();
  if(!(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('mastergrowbot_profile')).hasSeenTutorial && JSON.parse(localStorage.getItem('mastergrowbot_profile')).tutorialVersion===1)))throw Error('Tutorial completion not saved');
  await mobile.goto('http://127.0.0.1:3011/review/screen?screen=report');
  await mobile.getByRole('button',{name:'Close report'}).waitFor();
  for(const width of [375,390,393,402,414,430,440]) {
    await mobile.setViewportSize({width,height:844});
    if(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Report overflows at '+width);
  }
  await mobile.setViewportSize({width:390,height:844});await mobile.screenshot({path:'output/playwright/V11MasterGrowbotReport.png'});
  await mobile.goto('http://127.0.0.1:3011/review/screen?screen=summary');
  await mobile.getByRole('button',{name:'Start 3-Day Free Trial',exact:true}).waitFor();
  if(errors.length)throw Error(errors.join('; '));
  await context.close();return {actualAppNavigation:true,strainInputFontSize:size,tutorialReplay:true,reportWidths:7,pageErrors:errors};
}
