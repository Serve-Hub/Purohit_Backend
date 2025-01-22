import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js"; // Import user model

// Google OAuth strategy configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL:
        "http://purohit-backend.onrender.com/api/v1/users/auth/google/callback",
        // "http://localhost:3000/api/v1/users/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        // console.log(user);
        if (user) {
          if (user.googleId && user.googleId === profile.id) {
            user.email =
              profile.emails && profile.emails.length > 0
                ? profile.emails[0].value
                : user.email;
            user.firstName = profile.name.givenName || user.firstName;
            user.lastName = profile.name.familyName || user.lastName;
            // Save updated user information if changes were made
            await user.save();
          } else {
            // If user exists but Google ID is different, update Google ID
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // If user does not exist, create a new user
          user = await User.create({
            googleId: profile.id,
            email:
              profile.emails && profile.emails.length > 0
                ? profile.emails[0].value
                : null,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            isVerified: true,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
