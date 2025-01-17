const jwt = require("jsonwebtoken");
const dbModel = require("../models/database_model");
const bcrypt = require("bcryptjs");
require("dotenv").config();

class AuthController {
  
  async verifyEmail(req, res) {
    let connection;
    try {
      const token = req.params.token;
      const findTokenQuery =
        "SELECT `staff_id`, `expiry_date` FROM `medicalstaff_email_verification` WHERE `token` = ?";
      const [findTokenResponse] = await dbModel.query(findTokenQuery, [token]);
      const expDate = findTokenResponse
        ? new Date(findTokenResponse.expiry_date)
        : null;
      const currentDate = new Date();
      if (!findTokenResponse && expDate && expDate < currentDate) {
        return res.status(404).redirect("https://kalusugapp.com/invalid");
      } else {
        const updateEmailValidityQuery =
          "UPDATE `medicalstaff` SET `isVerified` = ? WHERE `staff_id` = ?";
        await dbModel.query(updateEmailValidityQuery, [
          true,
          findTokenResponse.staff_id,
        ]);

        const updateTokenQuery =
          "UPDATE `medicalstaff_email_verification` SET `token` = ? WHERE `staff_id` = ?";
        await dbModel.query(updateTokenQuery, ["", findTokenResponse.staff_id]);

        const date = new Date();
        const dateTime = `
          ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")} ${String(
          date.getHours()
        ).padStart(2, "0")}:${String(date.getMinutes()).padStart(
          2,
          "0"
        )}:${String(date.getSeconds()).padStart(2, "0")}`;
        const insertHistoryQuery =
          "INSERT INTO `medicalstaff_history` (`staff_id`, `action`, `action_details`, `citizen_family_id`, `action_datetime`) VALUES (?, ?, ?, ?, ?)";
        const historyPayload = [
          findTokenResponse.staff_id,
          "email verified",
          "successfully verified the email",
          null,
          dateTime,
        ];
        await dbModel.query(insertHistoryQuery, historyPayload);

        return res.redirect(
          process.env.PROJECT_STATE !== "production"
            ? "https://192.168.220.1:3000/login/validemail"
            : "https://kalusugapp.com/login/validemail"
        );
      }
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      if (connection) {
        dbModel.releaseConnection(connection);
      }
    }
  }

  async authStaff(req, res) {
    let connection;
    try {
      connection = await dbModel.getConnection();

      const { username, password, dateTime } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ status: 400, message: "Username and password are required" });
      }

      const userQuery =
        "SELECT `staff_id`, `username`, `password`, `role`, `isVerified`, `uuid` FROM `medicalstaff` WHERE `username` = ?";
      const [staff] = await dbModel.query(userQuery, username);

      if (!staff) {
        return res.status(401).json({ status: 401, message: "No user found." });
      }

      const passwordMatched = await bcrypt.compare(password, staff.password);
      if (!passwordMatched) {
        return res
          .status(401)
          .json({ status: 401, message: "Incorrect password!" });
      }

      const isVerified = Boolean(staff.isVerified);
      if (!isVerified) {
        return res.status(401).json({
          status: 401,
          message: "Email unverified! Verify first on your email.",
        });
      }

      const refreshToken = jwt.sign(
        {
          user_id: staff.staff_id,
          username: staff.username,
          role: staff.role,
          uuid: staff.uuid,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      const accessToken = jwt.sign(
        {
          user_id: staff.staff_id,
          username: staff.username,
          role: staff.role,
          uuid: staff.uuid,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "5m" }
      );

      const updateRefreshTokenQuery =
        "UPDATE `medicalstaff` SET `refresh_token` = ? WHERE `staff_id` = ?";
      const createStaffHistoryQuery =
        "INSERT INTO `medicalstaff_history` (`staff_id`, `action`, `action_details`, `citizen_family_id`, `action_datetime`) VALUES (?, ?, ?, ?, ?)";
      const staffHistoryValues = [
        staff.staff_id,
        "logged in",
        "logged in",
        null,
        dateTime,
      ];

      await dbModel.query(updateRefreshTokenQuery, [
        refreshToken,
        staff.staff_id,
      ]);
      await dbModel.query(createStaffHistoryQuery, staffHistoryValues);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite:
          process.env.PROJECT_STATE === "production" ? "Strict" : "None",
        maxAge: 1 * 24 * 60 * 60 * 1000, // persistent cookie with expiration
      });
      return res
        .status(200)
        .json({ status: 200, accessToken, message: "Login Successful!" });
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      if (connection) {
        dbModel.releaseConnection(connection);
      }
    }
  }

  async authToken(req, res) {
    let connection;
    try {
      const refreshToken = req.cookies.refreshToken;
      const authHeader = req.headers["authorization"];
      const username = req.body.username;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authorization token missing or malformed" });
      }
      const accessToken = authHeader.split(" ")[1];

      if (username === process.env.DEVELOPER_USERNAME) {
        jwt.verify(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET,
          (err, decoded) => {
            if (err) return res.status(403).json({ status: 403, err });
            const accessToken = jwt.sign(
              {
                user_id: decoded.user_id,
                username: decoded.username,
                role: decoded.role,
                uuid: decoded.uuid,
              },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: "5m" }
            );
            return res.status(200).json({ accessToken });
          }
        );
        return;
      }

      const [user] = await dbModel.query(
        "SELECT `refresh_token` FROM `medicalstaff` WHERE `username` = ?",
        [username]
      );
      if (!user || refreshToken !== user.refresh_token) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
        });
        return res
          .status(401)
          .json({ status: 401, message: "Unauthorized or malformed token!" });
      }

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
          if (err) {
            res.clearCookie("refreshToken", {
              httpOnly: true,
              secure: true,
              sameSite: "Strict",
            });
            return res.status(403).json({ status: 403, err });
          }
          const newAccessToken = jwt.sign(
            {
              user_id: decoded.user_id,
              username: decoded.username,
              role: decoded.role,
              uuid: decoded.uuid,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
          );
          return res.status(200).json({ accessToken: newAccessToken });
        }
      );
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error.message,
      });
    } finally {
      if (connection) {
        dbModel.releaseConnection(connection);
      }
    }
  }

  async refreshRefreshToken(req, res) {
    let connection;
    try {
      const username = req.body.username;
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
      }

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          if (err) {
            res.clearCookie("refreshToken", {
              httpOnly: true,
              secure: true,
              sameSite: "Strict",
            });
            const message = err.message;
            switch (err.name) {
              case "TokenExpiredError":
                return res.status(401).json({
                  error: "Refresh token expired",
                  expiredAt: err.expiredAt,
                });
              case "JsonWebTokenError":
              case "NotBeforeError":
                return res.status(401).json({ error: message });
              default:
                return res.status(400).json({ error: "Invalid refresh token" });
            }
          }

          const userQuery =
            "SELECT `username`, `role`, `staff_id` AS `user_id`, `uuid` FROM `medicalstaff` WHERE `username` = ?";
          const [user] = await dbModel.query(userQuery, [username]);
          if (!user) {
            return res
              .status(404)
              .json({ status: 404, message: "User not found!" });
          }

          const newRefreshToken = jwt.sign(
            {
              user_id: user.user_id,
              username: user.username,
              role: user.role,
              uuid: user.uuid,
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
          );

          const updateUserTokenQuery =
            "UPDATE `medicalstaff` SET `refresh_token` = ? WHERE `username` = ?";
          const updateUserTokenResponse = await dbModel.query(
            updateUserTokenQuery,
            [newRefreshToken, username]
          );
          if (updateUserTokenResponse.affectedRows === 0) {
            return res.status(409).json({
              status: 409,
              message: "Failed to update the refresh token!",
            });
          }

          res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
          });

          return res
            .status(200)
            .json({ message: "Refresh token updated successfully" });
        }
      );
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: error.message,
        error: error,
      });
    } finally {
      if (connection) {
        dbModel.releaseConnection(connection);
      }
    }
  }
}

module.exports = new AuthController();
