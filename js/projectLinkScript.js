//TODO: translate to JQuery
var scrollLinkPressed = false;
var topTitle = document.getElementById('topTitle');
var descriptionText = document.getElementById('descriptionText');
var animeText = document.getElementById('animeText');
var body = document.getElementsByTagName("BODY")[0];
var navbar = document.getElementsByTagName("nav")[0];

//Add underlines to clicked nav links
$('.navLink').click(function () {
	$('.navLink').removeClass('current');
	$(this).addClass('current');
});

//Start all the text at the top of the screen in their positions
// var topTitleAnimation = anime({
// 	targets: topTitle,
// 	translateY: -200,
// 	duration: 1
// });

//Remove underlines if scroll is detected because I haven't gotten the page to track how far you've scrolled yet
$(window).scroll(function (event) {
	if (!scrollLinkPressed) {
		$('.navLink').removeClass('current');
	}
});

//Smooth scrolling (not my code) - SOURCE: https://css-tricks.com/snippets/jquery/smooth-scrolling/
$('a[href*="#"]')
	.not('[href="#"]')
	.not('[href="#0"]')
	.click(function (event) {
		if (
			location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') &&
			location.hostname == this.hostname
		) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
			if (target.length) {
				event.preventDefault();
				scrollLinkPressed = true;
				$('html, body').animate({
					scrollTop: target.offset().top
				}, 1000, function () {
					var $target = $(target);
					$target.focus();
					if ($target.is(":focus")) {
						return false;
					} else {
						$target.attr('tabindex', '-1');
						$target.focus();
					}
				});
				//This part is mine, it prevents the underlines from disappearing if the page is smooth scrolling rather than the user scrolling
				setTimeout(function () {
					scrollLinkPressed = false;
				}, 1100);
			}
		}
	});

		// Source: http://detectmobilebrowsers.com/
	window.mobilecheck = function () {
		var check = false;
		(function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
		return check;
	};

	//This function is called when view cookie details is pressed
	/*
	function showCookieOptions() {
		if ($('#cookieNotifText')[0].style.height == "7%" || $('#cookieNotifText')[0].style.height == "") {
			var tween = new TWEEN.Tween({
				height: 7
			}).to({
				height: 25
			}, 1000).easing(TWEEN.Easing.Quadratic.Out).onUpdate(function () {
				$('#cookieNotifText')[0].style.height = this.height + '%';
			}).start();
		} else if ($('#cookieNotifText')[0].style.height == "25%") {
			var tween = new TWEEN.Tween({
				height: 25
			}).to({
				height: 7
			}, 1000).easing(TWEEN.Easing.Quadratic.Out).onUpdate(function () {
				$('#cookieNotifText')[0].style.height = this.height + '%';
			}).start();
		}

		animateCookieText();
	}

	function hideCookieText() {
		if ($('#cookieNotifText')[0].style.height == "7%" || $('#cookieNotifText')[0].style.height == "") {
			var tween = new TWEEN.Tween({
				height: 7
			}).to({
				height: 0
			}, 500).easing(TWEEN.Easing.Quadratic.Out).onUpdate(function () {
				$('#cookieNotifText')[0].style.height = this.height + '%';
			}).start();
		} else if ($('#cookieNotifText')[0].style.height == "25%") {
			var tween = new TWEEN.Tween({
				height: 25
			}).to({
				height: 0
			}, 1000).easing(TWEEN.Easing.Quadratic.Out).onUpdate(function () {
				$('#cookieNotifText')[0].style.height = this.height + '%';
			}).start();
		}

		animateCookieText();
	}

	function animateCookieText(time) {
		requestAnimationFrame(animateCookieText);
		TWEEN.update(time);

		if ($('#cookieNotifText')[0].style.height == "0%") {
			$('#cookieNotifText')[0].style.border = '0';
		}
	}
	*/

//This runs all of the animations that need to play when the site loads
window.onload = function () {
	AOS.init();

	switch (window.location.href.substring(window.location.href.indexOf('#'), window.location.href.length)) {
		case '#aboutText':
			$('.navLink').removeClass('current');
			$('#aboutTextLink').addClass('current');
			break;
		case '#experience':
			$('.navLink').removeClass('current');
			$('#experienceLink').addClass('current');
			break;
		case '#activeProjects':
			$('.navLink').removeClass('current');
			$('#activeProjectsLink').addClass('current');
			break;
		case '#majorProjects':
			$('.navLink').removeClass('current');
			$('#majorProjectsLink').addClass('current');
			break;
	}

	// topTitleAnimation = anime({
	// 	targets: topTitle,
	// 	delay: 500,
	// 	translateY: window.innerHeight / 3,
	// 	easing: 'easeInOutQuart',
	// 	duration: 1000
	// });

	if (mobilecheck()) {
		// Mobile only scripting
	}

	if (window.location.href.indexOf("/viewProject") != -1) {
		var projectFileName = window.location.href.substring(window.location.href.indexOf("?") + 1);
		alert(projectFileName);
		$.ajax({
			headers: {},
			url: window.location.href + projectFileName,
			type: "GET",
			success: function (response) {
				pongTime = Date.now();
				pingText.text = 'Ping: ' + String(pongTime - pingTime) + 'ms';
			},
			error: function (error) {
				console.error('Server refused to connect');
				console.log(error);
				pingText.text = 'Ping: ERROR';
			}
		});
	}
};