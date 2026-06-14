const moment = require("moment-timezone");
const fs = require("fs-extra");
const axios = require("axios");
const cheerio = require("cheerio");
const Canvas = require("canvas");
const https = require("https");
const agent = new https.Agent({
	rejectUnauthorized: false
});
const { getStreamFromURL } = global.utils;

module.exports = {
	config: {
		name: "moon",
		version: "1.4",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			vi: "xem ảnh mặt trăng vào đêm bạn chọn (dd/mm/yyyy)",
			en: "view moon image on the night you choose (dd/mm/yyyy)"
		},
		category: "image",
		guide: {
			vi: "  {pn} <ngày/tháng/năm>"
				+ "\n   {pn} <ngày/tháng/năm> <caption>",
			en: "  {pn} <day/month/year>"
				+ "\n   {pn} <day/month/year> <caption>"
		}
	},

	langs: {
		vi: {
			invalidDateFormat: "Vui lòng nhập ngày/tháng/năm hợp lệ theo định dạng DD/MM/YYYY",
			error: "Đã xảy ra lỗi không thể lấy ảnh mặt trăng của ngày %1",
			invalidDate: "Ngày %1 không hợp lệ",
			caption: "- Ảnh mặt trăng vào đêm %1"
		},
		en: {
			invalidDateFormat: "Please enter a valid date in DD/MM/YYYY format",
			error: "An error occurred while getting the moon image of %1",
			invalidDate: "%1 is not a valid date",
			caption: "- Moon image on %1"
		}
	},

	onStart: async function ({ args, message, getLang }) {
		const date = checkDate(args[0]);
		if (!date)
			return message.reply(getLang("invalidDateFormat"));
		const linkCrawl = `https://lunaf.com/lunar-calendar/${date}`;

		let html;
		try {
			html = await axios.get(linkCrawl, { httpsAgent: agent });
		}
		catch (err) {
			return message.reply(getLang("error", args[0]));
		}

		const $ = cheerio.load(html.data);
		const href = $("figure img").attr("data-ezsrcset");
		const number = href.match(/phase-(\d+)\.png/)[1];
		const imgSrc = moonImages[Number(number)];
		const { data: imgSrcBuffer } = await axios.get(imgSrc, {
			responseType: "arraybuffer"
		});

		const msg = getLang("caption", args[0])
			+ `\n- ${$($('h3').get()[0]).text()}`
			+ `\n- ${$("#phimg > small").text()}`
			+ `\n- ${linkCrawl}`
			+ `\n- https://lunaf.com/img/moon/h-phase-${number}.png`;

		if (args[1]) {
			const canvas = Canvas.createCanvas(1080, 2400);
			const ctx = canvas.getContext("2d");
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, 1080, 2400);

			const moon = await Canvas.loadImage(imgSrcBuffer);
			centerImage(ctx, moon, 1080 / 2, 2400 / 2, 970, 970);

			ctx.font = "60px \"Kanit SemiBold\"";
			const wrapText = getLines(ctx, args.slice(1).join(" "), 594);
			ctx.textAlign = "center";
			ctx.fillStyle = "white";

			const yStartText = 2095;//2042;
			//ctx.fillRect(0, 2042, 1080, 5);
			let heightText = yStartText - wrapText.length / 2 * 75;
			for (const text of wrapText) {
				ctx.fillText(text, 750, heightText);
				heightText += 75;
			}

			const pathSave = __dirname + "/tmp/wallMoon.png";
			fs.writeFileSync(pathSave, canvas.toBuffer());
			message.reply({
				body: msg,
				attachment: fs.createReadStream(pathSave)
			}, () => fs.unlinkSync(pathSave));
		}
		else {
			const streamImg = await getStreamFromURL(imgSrc);
			message.reply({
				body: msg,
				attachment: streamImg
			});
		}
	}
};


const pathFont = __dirname + "/assets/font/Kanit-SemiBoldItalic.ttf";
Canvas.registerFont(pathFont, {
	family: "Kanit SemiBold"
});

function getLines(ctx, text, maxWidth) {
	const words = text.split(" ");
	const lines = [];
	let currentLine = words[0];
	for (let i = 1; i < words.length; i++) {
		const word = words[i];
		const width = ctx.measureText(`${currentLine} ${word}`).width;
		if (width < maxWidth) {
			currentLine += " " + word;
		}
		else {
			lines.push(currentLine);
			currentLine = word;
		}
	}
	lines.push(currentLine);
	return lines;
}

function centerImage(ctx, img, x, y, sizeX, sizeY) {
	ctx.drawImage(img, x - sizeX / 2, y - sizeY / 2, sizeX, sizeY);
}

function checkDate(date) {
	const [day0, month0, year0] = (date || "").split('/');
	const day = (day0 || "").length == 1 ? "0" + day0 : day0;
	const month = (month0 || "").length == 1 ? "0" + month0 : month0;
	const year = year0 || "";
	const newDateFormat = year + "/" + month + "/" + day;
	return moment(newDateFormat, 'YYYY/MM/DD', true).isValid() ? newDateFormat : false;
}

const moonImages = [
	'assets/moon-0.png',
	'assets/moon-1.png',
	'assets/moon-2.png',
	'assets/moon-3.png',
	'assets/moon-4.png',
	'assets/moon-5.png',
	'assets/moon-6.png',
	'assets/moon-7.png',
	'assets/moon-8.png',
	'assets/moon-9.png',
	'assets/moon-10.png',
	'assets/moon-11.png',
	'assets/moon-12.png',
	'assets/moon-13.png',
	'assets/moon-14.png',
	'assets/moon-15.png',
	'assets/moon-16.png',
	'assets/moon-17.png',
	'assets/moon-18.png',
	'assets/moon-19.png',
	'assets/moon-20.png',
	'assets/moon-21.png',
	'assets/moon-22.png',
	'assets/moon-23.png',
	'assets/moon-24.png',
	'assets/moon-25.png',
	'assets/moon-26.png',
	'assets/moon-27.png',
	'assets/moon-28.png',
	'assets/moon-29.png',
	'assets/moon-30.png',
	'https://i.ibb.co/s5z0w9R/moon-31.png'
];
