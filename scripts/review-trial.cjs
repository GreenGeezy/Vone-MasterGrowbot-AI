async (page) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:402,height:874});
  for (const trial of ['eligible','ineligible','unknown']) {
    await page.goto(`http://127.0.0.1:3011/review/screen?screen=pro&trial=${trial}`);
    const label=trial==='eligible'?'Start 3-Day Free Trial':'Continue';
    await page.getByRole('button',{name:label,exact:true}).waitFor();
    for(const period of ['Weekly','Monthly','Yearly']) {
      await page.locator('[aria-label="Pro billing period"]').getByRole('button',{name:new RegExp(period)}).click();
      await page.getByRole('button',{name:label,exact:true}).waitFor();
      const terms=await page.locator('footer').innerText();
      if(terms.includes('3 days free') !== (trial==='eligible')) throw Error('Trial terms disagree with eligibility');
    }
    if(trial==='eligible') { await page.emulateMedia({reducedMotion:'reduce'}); await page.screenshot({path:'output/playwright/V10MasterGrowbotProTrial.png'}); await page.emulateMedia({reducedMotion:'no-preference'}); }
  }
  await page.goto('http://127.0.0.1:3011/review/screen?screen=journal');
  if(await page.locator('.premium-context-card').count())throw Error('Journal Premium card must be removed');
  await page.goto('http://127.0.0.1:3011/review/screen?screen=premium');
  await page.getByRole('button',{name:'Continue with Premium'}).waitFor();
  await page.getByText('No free trial.',{exact:true}).waitFor();
  if(await page.getByRole('button',{name:/Start.*Free Trial/}).count())throw Error('Premium incorrectly offers a trial');
  await page.screenshot({path:'output/playwright/V10MasterGrowbotPremium.png'});
  for (const width of [375,390,393,402,414,430,440]) {
    await page.setViewportSize({width,height:667});
    await page.evaluate(()=>document.documentElement.style.fontSize='20px');
    const valid=await page.locator('.subscription-footer').evaluate(el=>el.getBoundingClientRect().top>=0 && el.getBoundingClientRect().bottom<=innerHeight+1 && document.documentElement.scrollWidth<=innerWidth+1);
    if(!valid)throw Error('Premium footer clips at '+width);
  }
  await page.getByRole('button',{name:'Close Premium'}).click();
  await page.getByRole('heading',{name:'Journal',exact:true}).waitFor();
  if(errors.length)throw Error(errors.join(';'));
  return {trialStates:3,plansPerState:3,journalPremiumRoundTrip:true,pageErrors:errors};
}
