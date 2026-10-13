async(page)=>{
 await page.setViewportSize({width:402,height:874});
 await page.goto('http://127.0.0.1:3011/review/screen?screen=sample');
 await page.getByRole('button',{name:'Make it yours'}).waitFor();
 if(await page.getByText('Example',{exact:true}).count()!==1)throw Error('Example label repeated');
 await page.getByLabel('AI health score 88 out of 100').waitFor();
 await page.getByText('YOUR NEXT CHECK',{exact:true}).waitFor();
 const tip=page.locator('.report-tip');const box=await tip.boundingBox();const footer=await page.locator('.journey-footer').boundingBox();
 if(!box||box.y+box.height>footer.y)throw Error('Tip not visible on standard phone');
 await page.screenshot({path:'output/playwright/V8MasterGrowbotPlantReport.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 if(await page.locator('.sample-playing').count())throw Error('Reduced motion still animates');
 await page.emulateMedia({reducedMotion:'no-preference'});
 return {singleExampleLabel:true,existingScore:88,visibleTip:true,reducedMotion:true};
}
