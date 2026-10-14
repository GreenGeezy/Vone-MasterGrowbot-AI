async (page) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:3011/review/screen?screen=launch');
  await page.getByRole('heading',{name:'Your personal grow coach.'}).waitFor();
  const artwork=page.locator('.app-launch-art');
  await artwork.evaluate(img=>img.decode());
  await page.screenshot({path:'output/playwright/V14MasterGrowbotLaunch.png'});
  for(const width of [375,390,393,402,414,430,440]) {
    await page.setViewportSize({width,height:667});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Launch overflow at '+width);
  }
  await page.setViewportSize({width:1280,height:1000});
  await page.goto('http://127.0.0.1:3011/review');
  return {launchWidths:7,artworkLoaded:true};
}
