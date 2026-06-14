const moment = require("moment-timezone");

// Customizable loan duration (in days)
const LOAN_DUE_DAYS = 7;
const BAN_COOLDOWN_DAYS = 30;

module.exports = {
	config: {
		name: "loanadmin",
		aliases: ["la"],
		version: "2.4.71",
		author: "RIYAD XD",
		countDown: 5,
		role: 2,
		description: {
			en: "Manage bank loan requests and bans (Admin only)"
		},
		category: "economy",
		guide: {
			en: "   {pn} pending - View pending loan requests\n"
				+ "   {pn} active - View active loans\n"
				+ "   {pn} banned - View banned users\n"
				+ "   {pn} unban <reply> - Unban a user\n"
				+ "   Reply 'yes' or 'no' to approve/reject loan requests"
		}
	},

	langs: {
		en: {
			noPending: "✅ No pending loan requests!",
			noActive: "✅ No active loans!",
			noBanned: "✅ No banned users!",
			unbanSuccess: "✅ User unbanned successfully! Their loan has been cleared.",
			cannotUnbanYet: "❌ User can only be unbanned after %1",
			notBanned: "❌ User is not banned!"
		}
	},

	ST: async function ({ args, message, event, usersData, bankData, getLang, api }) {
		const command = args[0]?.toLowerCase();

		switch (command) {
			case "pending": {
				const allBanks = global.db.allBankData;
				const pending = [];

				for (const bank of allBanks) {
					const pendingRequests = bank.loanRequests.filter(r => r.status === "pending");
					if (pendingRequests.length > 0) {
						const user = await usersData.get(bank.userID);
						for (const req of pendingRequests) {
							const threadInfo = await api.getThreadInfo(req.threadID);
							pending.push({
								user: user.name,
								userID: bank.userID,
								amount: req.amount,
								totalRepay: req.totalRepay,
								requestID: req.requestID,
								threadName: threadInfo.threadName || "Unknown",
								threadID: req.threadID,
								requestedAt: req.requestedAt
							});
						}
					}
				}

				if (pending.length === 0) {
					return message.reply(getLang("noPending"));
				}

				let msg = "📋 PENDING LOAN REQUESTS\n━━━━━━━━━━━━━━━━\n";
				pending.forEach((req, i) => {
					msg += `\n${i + 1}. ${req.user}\n`;
					msg += `   💰 Amount: $${req.amount.toLocaleString()}\n`;
					msg += `   💳 Repay: $${req.totalRepay.toLocaleString()}\n`;
					msg += `   📍 Thread: ${req.threadName}\n`;
					msg += `   ⏰ ${moment(req.requestedAt).fromNow()}\n`;
				});

				msg += `\n💡 Reply with serial number and 'yes' or 'no' to approve/reject\n`;
				msg += `Example: 1 yes`;

				return message.reply(msg, (err, info) => {
					if (!err) {
						global.RIYAD XD.onReply.set(info.messageID, {
							commandName: module.exports.config.name,
							messageID: info.messageID,
							author: event.senderID,
							type: "loanApprovalList",
							requests: pending
						});
					}
				});
			}

			case "active": {
				const allBanks = global.db.allBankData;
				const active = [];

				for (const bank of allBanks) {
					if (bank.loan.amount > 0) {
						const user = await usersData.get(bank.userID);
						const dueDate = new Date(bank.loan.dueDate);
						const now = new Date();
						const isOverdue = now > dueDate;

						active.push({
							user: user.name,
							userID: bank.userID,
							amount: bank.loan.amount,
							takenAt: bank.loan.takenAt,
							dueDate: bank.loan.dueDate,
							isOverdue,
							threadID: bank.loan.threadID
						});
					}
				}

				if (active.length === 0) {
					return message.reply(getLang("noActive"));
				}

				let msg = "💳 ACTIVE LOANS\n━━━━━━━━━━━━━━━━\n";
				active.forEach((loan, i) => {
					const status = loan.isOverdue ? "⚠️ OVERDUE" : "✅ Active";
					msg += `\n${i + 1}. ${loan.user} ${status}\n`;
					msg += `   💰 Remaining: $${loan.amount.toLocaleString()}\n`;
					msg += `   📅 Taken: ${moment(loan.takenAt).format("MMM DD, YYYY")}\n`;
					msg += `   ⏰ Due: ${moment(loan.dueDate).format("MMM DD, YYYY")}\n`;
					if (loan.isOverdue) {
						msg += `   🚨 Overdue by ${moment().diff(moment(loan.dueDate), 'days')} days\n`;
					}
				});

				return message.reply(msg);
			}

			case "banned": {
				const allBanks = global.db.allBankData;
				const banned = [];

				for (const bank of allBanks) {
					if (bank.banned.isBanned) {
						const user = await usersData.get(bank.userID);
						banned.push({
							user: user.name,
							userID: bank.userID,
							reason: bank.banned.reason,
							bannedAt: bank.banned.bannedAt,
							canUnbanAt: bank.banned.canUnbanAt
						});
					}
				}

				if (banned.length === 0) {
					return message.reply(getLang("noBanned"));
				}

				let msg = "🚫 BANNED USERS\n━━━━━━━━━━━━━━━━\n";
				banned.forEach((ban, i) => {
					const canUnban = new Date(ban.canUnbanAt) < new Date();
					msg += `\n${i + 1}. ${ban.user}\n`;
					msg += `   📛 Reason: ${ban.reason}\n`;
					msg += `   📅 Banned: ${moment(ban.bannedAt).format("MMM DD, YYYY")}\n`;
					msg += `   ${canUnban ? "✅ Can unban now" : "⏰ Unban after: " + moment(ban.canUnbanAt).format("MMM DD, YYYY")}\n`;
				});

				msg += `\n💡 Reply to a banned user's message and use '{pn} unban' to unban them`;

				return message.reply(msg);
			}

			case "unban": {
				if (!event.messageReply) {
					return message.reply("❌ Please reply to a banned user's message!");
				}

				const targetID = event.messageReply.senderID;
				const targetBankData = await bankData.get(targetID);

				if (!targetBankData.banned.isBanned) {
					return message.reply(getLang("notBanned"));
				}

				const canUnbanAt = new Date(targetBankData.banned.canUnbanAt);
				const now = new Date();

				if (now < canUnbanAt) {
					return message.reply(getLang("cannotUnbanYet", moment(canUnbanAt).format("MMM DD, YYYY HH:mm")));
				}

				// Clear ban and loan
				targetBankData.banned = {
					isBanned: false,
					reason: null,
					bannedAt: null,
					canUnbanAt: null
				};
				targetBankData.loan = {
					amount: 0,
					takenAt: null,
					interestRate: 5,
					dueDate: null,
					threadID: null
				};

				await bankData.set(targetID, targetBankData);
				await bankData.addTransaction(targetID, {
					type: "unbanned",
					amount: 0
				});

				const targetUser = await usersData.get(targetID);
				return message.reply(getLang("unbanSuccess"));
			}

			default:
				return message.SyntaxError();
		}
	},

	onReply: async function ({ event, Reply, message, usersData, api }) {
		const { author, type } = Reply;
		const adminConfig = global.RIYAD XD.config.adminBot;
		const bankData = global.db.bankData;

		if (!adminConfig.includes(event.senderID)) {
			return;
		}

		if (type === "loanApproval") {
			const response = event.body.toLowerCase().trim();
			const { requestID, amount, totalRepay, threadID, author: requesterID } = Reply;

			if (!["yes", "no"].includes(response)) {
				return message.reply("❌ Reply 'yes' to approve or 'no' to reject!");
			}

			const requesterBankData = await bankData.get(requesterID);
			const requestIndex = requesterBankData.loanRequests.findIndex(r => r.requestID === requestID);

			if (requestIndex === -1) {
				return message.reply("❌ Loan request not found!");
			}

			const requesterUserData = await usersData.get(requesterID);

			if (response === "yes") {
				// Approve loan
				const dueDate = new Date();
				dueDate.setDate(dueDate.getDate() + LOAN_DUE_DAYS);

				requesterBankData.loan = {
					amount: totalRepay,
					takenAt: new Date(),
					interestRate: 5,
					dueDate,
					threadID
				};
				requesterBankData.loanRequests[requestIndex].status = "approved";
				requesterBankData.bankBalance += amount;

				await bankData.set(requesterID, requesterBankData);
				await bankData.addTransaction(requesterID, {
					type: "loan_approved",
					amount,
					totalRepay
				});

				// Notify user with mention
				api.sendMessage(
					{
						body: `@${requesterUserData.name} ✅ LOAN APPROVED!\n━━━━━━━━━━━━━━━━\n` +
							`💰 Amount: $${amount.toLocaleString()}\n` +
							`💳 Total to Repay: $${totalRepay.toLocaleString()}\n` +
							`📅 Due Date: ${moment(dueDate).format("MMM DD, YYYY")}\n` +
							`⚠️ Pay within ${LOAN_DUE_DAYS} days or face ban!`,
						mentions: [{
							tag: `@${requesterUserData.name}`,
							id: requesterID
						}]
					},
					threadID
				);

				return message.reply(`✅ Loan approved for ${requesterUserData.name}!`);
			} else {
				// Reject loan
				requesterBankData.loanRequests[requestIndex].status = "rejected";
				await bankData.set(requesterID, requesterBankData);

				// Notify user with mention
				api.sendMessage(
					{
						body: `@${requesterUserData.name} ❌ LOAN REJECTED\n━━━━━━━━━━━━━━━━\n` +
							`Your loan request for $${amount.toLocaleString()} was rejected.\n` +
							`You can reapply for a loan anytime.`,
						mentions: [{
							tag: `@${requesterUserData.name}`,
							id: requesterID
						}]
					},
					threadID
				);

				return message.reply(`❌ Loan rejected for ${requesterUserData.name}.`);
			}
		}

		if (type === "loanApprovalList") {
			const parts = event.body.trim().split(/\s+/);
			const serialNum = parseInt(parts[0]);
			const response = parts[1]?.toLowerCase();

			if (!["yes", "no"].includes(response)) {
				return message.reply("❌ Format: <serial number> yes/no");
			}

			if (isNaN(serialNum) || serialNum < 1 || serialNum > Reply.requests.length) {
				return message.reply("❌ Invalid serial number!");
			}

			const request = Reply.requests[serialNum - 1];

			const requesterBankData = await bankData.get(request.userID);
			const requestIndex = requesterBankData.loanRequests.findIndex(r => r.requestID === request.requestID);

			if (response === "yes") {
				const dueDate = new Date();
				dueDate.setDate(dueDate.getDate() + LOAN_DUE_DAYS);

				requesterBankData.loan = {
					amount: request.totalRepay,
					takenAt: new Date(),
					interestRate: 5,
					dueDate,
					threadID: request.threadID
				};
				requesterBankData.loanRequests[requestIndex].status = "approved";
				requesterBankData.bankBalance += request.amount;

				await bankData.set(request.userID, requesterBankData);

				// Notify user with mention
				api.sendMessage(
					{
						body: `@${request.user} ✅ LOAN APPROVED!\n━━━━━━━━━━━━━━━━\n` +
							`💰 Amount: $${request.amount.toLocaleString()}\n` +
							`💳 Total to Repay: $${request.totalRepay.toLocaleString()}\n` +
							`📅 Due Date: ${moment(dueDate).format("MMM DD, YYYY")}\n` +
							`⚠️ Pay within ${LOAN_DUE_DAYS} days or face ban!`,
						mentions: [{
							tag: `@${request.user}`,
							id: request.userID
						}]
					},
					request.threadID
				);

				return message.reply(`✅ Loan approved for ${request.user}!`);
			} else {
				requesterBankData.loanRequests[requestIndex].status = "rejected";
				await bankData.set(request.userID, requesterBankData);

				// Notify user with mention
				api.sendMessage(
					{
						body: `@${request.user} ❌ LOAN REJECTED\n━━━━━━━━━━━━━━━━\n` +
							`Your loan request for $${request.amount.toLocaleString()} was rejected.\n` +
							`You can reapply for a loan anytime.`,
						mentions: [{
							tag: `@${request.user}`,
							id: request.userID
						}]
					},
					request.threadID
				);

				return message.reply(`❌ Loan rejected for ${request.user}.`);
			}
		}
	}
};