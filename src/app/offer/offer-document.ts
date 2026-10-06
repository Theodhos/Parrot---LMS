import { offerMarkup } from "./offer-markup";
import { offerStyles } from "./offer-styles";

/** The complete HTML document served at /offer (see route.ts). */
export const offerDocument = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>12 Private Sessions With Justice Bellar | Parrot Kindergarten</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,700&display=swap" rel="stylesheet">
<style>${offerStyles}</style>
<noscript><style>.fade-in{opacity:1;transform:none}</style></noscript>
</head>
<body>
${offerMarkup}
<script>
// Fade-in on scroll
(function(){
  var els=document.querySelectorAll('.fade-in');
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  els.forEach(function(el){obs.observe(el);});
})();
</script>
</body>
</html>`;
