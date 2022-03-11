/* eslint-disable new-cap */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
import pg from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import multer from 'multer';

const multerUpload = multer({ dest: 'public/images/' });
const SALT = 'never gonna give you up';

const { Pool } = pg;
const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));

const pool = new Pool({
  user: 'kaichungyeo',
  host: 'localhost',
  database: 'Mymusic',
  port: 5432,
});

app.get('/', (req, res) => {
  const allQuery = 'SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username FROM song INNER JOIN artist ON song.artist = artist.id INNER JOIN users ON song.uploader = users.id';
  const { username } = req.cookies;
  pool.query(allQuery, (allQueryError, allQueryResult) => {
    if (allQueryError) {
      console.log('error', allQueryError);
    }

    if (req.cookies.loggedIn === undefined) {
      res.redirect('/login');
    } else {
      const genreQuery = 'SELECT * FROM genre ';
      pool.query(genreQuery, (genreErr, genreRes) => {
        if (genreErr) {
          console.log('genreErr', genreRes);
        } else {
          const genre = genreRes.rows;
          console.log(genre);
          console.log(genre.song_id);
          const allNotes = allQueryResult.rows;
          console.log(req.cookies.loggedIn);
          const artistQuery = 'SELECT * FROM artist';
          pool.query(artistQuery, (artistErr, artistRes) => {
            if (artistErr) {
              console.log('artistErr', artistErr);
            } else {
              const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
              pool.query(playlistQuery, (playlistErr, playlistRes) => {
                if (playlistErr) {
                  console.log('playlistErr', playlistErr);
                } else {
                  const playlist = playlistRes.rows;
                  const artist = artistRes.rows;
                  res.render('main_page', {
                    allNotes, username, genre, artist, playlist,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

app.get('/artist/:index', (req, res) => {
  const inputData = req.params.index;
  const allQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username FROM song INNER JOIN artist ON song.artist = artist.id INNER JOIN users ON song.uploader = users.id WHERE artist.img = '${inputData}'`;
  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    const genreQuery = 'SELECT * FROM genre ';
    pool.query(genreQuery, (genreErr, genreRes) => {
      if (genreErr) {
        console.log('genreErr', genreRes);
      } else {
        const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
        pool.query(playlistQuery, (playlistErr, playlistRes) => {
          if (playlistErr) {
            console.log('playlistErr', playlistErr);
          } else {
            const playlist = playlistRes.rows;
            const genre = genreRes.rows;
            const user = req.cookies.username;
            const allNotes = allQueryResult.rows;
            const input = allNotes[0].name
            res.render('artist', {
              allNotes, user, genre, playlist, inputData, input
            });
          }
        });
      }
    });
  }
  });
});

app.get('/add', (req, res) => {
  const allQuery = 'SELECT * FROM song';
  pool.query(allQuery, (allQueryError, allQueryResult) => {
    if (allQueryError) {
      console.log('error', allQueryError);
    } else {
      console.log(allQueryResult.rows);
      const allNotes = allQueryResult.rows;
      // const { loggedIn } = req.cookies;
      // console.log('logged in?', loggedIn);
      res.render('new_song', { allNotes });
    }
  });
});

app.post('/add', multerUpload.single('photo'), (req, res) => {
  const checkQuery = `SELECT artist.name FROM artist WHERE artist.name = '${req.body.artist}'`;
  pool.query(checkQuery, (err, result) => {
    if (err) {
      console.log('err', err);
    }
    if (result.rows.length === 1) {
      const selectArtist = `SELECT artist.id FROM artist WHERE artist.name = '${req.body.artist}'`;
      pool.query(selectArtist, (artistErr, artistRes) => {
        if (artistErr) {
          console.log('error', artistErr);
        } else {
          console.log(artistRes.rows);
          const asd = artistRes.rows;
          const insertQuery = `INSERT INTO song (title, duration, link, uploader, artist) VALUES ('${req.body.title}', '${req.body.duration}', '${req.body.link}', ${req.cookies.userId}, ${asd[0].id})`;
          pool.query(insertQuery, (insertErr2, insertRes) => {
            if (insertErr2) {
              console.log('error', insertErr2);
            } else {
              const idQuery = `SELECT song.id FROM song 
                WHERE song.title = '${req.body.title}'
                AND song.link = '${req.body.link}'`;
              pool.query(idQuery, (idErr, idRes) => {
                if (idErr) {
                  console.log('idErr', idErr);
                } else {
                  console.log(idRes.rows);
                  const idSong = idRes.rows;
                  console.log(`this is id rows: ${idSong}`);
                  const genres = req.body;
                  genres.genre.forEach((g) => {
                    const genreQuery = `INSERT INTO genre (name, song_id) VALUES ('${g}', '${idSong[0].id}')`;
                    pool.query(genreQuery, (genreErr, genreRes) => {
                      if (genreErr) {
                        console.log('genreErr', genreErr);
                      } else {
                        console.log('done');
                      }
                    });
                  });
                  res.redirect('/');
                }
              });
            }
          });
        }
      });
    } else {
      console.log(req.file);
      const allQuery = `INSERT INTO artist (name,img) VALUES ('${req.body.artist}', '${req.file.filename}')`;
      pool.query(allQuery, (allQueryError, allQueryResult) =>
      { if (allQueryError) {
        console.log('error', allQueryError);
      } else {
        const selectArtist = `SELECT artist.id FROM artist WHERE artist.name = '${req.body.artist}'`;
        pool.query(selectArtist, (artistErr2, artistRes2) => {
          if (artistErr2) {
            console.log('error2', artistErr2);
          } else {
            console.log(artistRes2.rows);
            const artist = artistRes2.rows;
            const insertQuery = `INSERT INTO song (title, duration, link, uploader, artist) VALUES ('${req.body.title}', '${req.body.duration}', '${req.body.link}', ${req.cookies.userId}, ${artist[0].id})`;
            pool.query(insertQuery, (insertErr2, insertRes) => {
              if (insertErr2) {
                console.log('error', insertErr2);
              } else {
                const idQuery = `SELECT song.id FROM song 
                WHERE song.title = '${req.body.title}'
                AND song.link = '${req.body.link}'`;
                pool.query(idQuery, (idErr, idRes) => {
                  if (idErr) {
                    console.log('idErr', idErr);
                  } else {
                    const idSong = idRes.rows;
                    // const genres = req.body;
                    const genres = Array.isArray(req.body.genre) ? req.body.genre : [req.body.genre];
                    console.log(genres)
                    genres.forEach((g) => {
                      const genreQuery = `INSERT INTO genre (name, song_id) VALUES ('${g}', '${idSong[0].id}')`;
                      pool.query(genreQuery, (genreErr, genreRes) => {
                        if (genreErr) {
                          console.log('genreErr', genreErr);
                        } else {
                          console.log('done');
                        }
                      });
                    });
                    res.redirect('/');
                  }
                });
              }
            });
          }
        });
      }
      });
    }
  });
});

app.get('/register', (req, res) => {
  const response = '';
  res.render('register', { response });
});

app.post('/register', (req, res) => {
  if (req.body.password1 !== req.body.password2) {
    const response = 'password not the same';
    console.log('password not the same');
    res.render('register', { response });
  } else {
    console.log('account created');

    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    shaObj.update(req.body.password1);

    const hashedPassword = shaObj.getHash('HEX');
    console.log(hashedPassword);
    console.log(req.body.username);
    const data = [req.body.username, hashedPassword];

    const allQuery = 'INSERT INTO users (username, password) VALUES ($1,$2)';
    pool.query(allQuery, data, (error, result) => {
      if (error) {
        console.log('error', error);
      } else {
      // console.log(Result.rows);
        res.redirect('/');
      }
    });
  }
});

app.get('/login', (req, res) => {
  const response = '';
  console.log(response);
  res.render('login', { response });
});

app.post('/login', (req, res) => {
  console.log('request came in');

  const values = [req.body.username];

  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(req.body.password);

  const hashedPassword = shaObj.getHash('HEX');

  pool.query('SELECT * from users WHERE username=$1', values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }

    if (result.rows.length === 0) {
      const response = 'username does not exist';
      res.render('login', { response });
      return;
    }
    const user = result.rows[0];

    if (user.password === hashedPassword) {
      const allQuery = 'SELECT * FROM song INNER JOIN artist ON song.artist = artist.id INNER JOIN users ON song.uploader = users.id';
      pool.query(allQuery, (allQueryError, allQueryResult) => {
        if (allQueryError) {
          console.log('error', allQueryError);
        } else {
          // console.log(allQueryResult.rows);
          res.cookie('loggedIn', true);
          res.cookie('userId', user.id);
          res.cookie('username', user.username);
          const allNotes = allQueryResult.rows;
          const { username } = req.cookies;
          res.redirect('/');
        } });
    } else {
      const response = 'wrong password';
      res.render('login', { response });
    }
  });
});

app.post('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('userId');
  res.redirect('/login');
});

app.get('/user/:index', (req, res) => {
  const inputData = req.params.index;
  const allQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img FROM song INNER JOIN artist ON song.artist = artist.id INNER JOIN users ON song.uploader = users.id WHERE users.username = '${inputData}'`;
  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    const genreQuery = 'SELECT * FROM genre ';

    pool.query(genreQuery, (genreErr, genreRes) => {
      if (genreErr) {
        console.log('genreErr', genreRes);
      } else {
        const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
        pool.query(playlistQuery, (playlistErr, playlistRes) => {
          if (playlistErr) {
            console.log('playlistErr', playlistErr);
          } else {
            const playlist = playlistRes.rows;
            const genre = genreRes.rows;
            const user = req.cookies.username;
            const allNotes = allQueryResult.rows;
            res.render('user', {
              allNotes, user, genre, playlist, inputData,
            });
          }
        });
      }
    });
  }
  });
});

app.get('/music/:index', (req, res) => {
  const inputData = req.params.index;
  const allQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username, comment.post FROM song 
  INNER JOIN artist ON song.artist = artist.id 
  INNER JOIN users ON song.uploader = users.id
  LEFT JOIN comment On song.id = comment.song_id
  WHERE song.id = ${inputData}`;

  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    const commentQuery = 'SELECT * FROM comment';
    pool.query(commentQuery, (commentErr, commentRes) => {
      if (commentErr) {
        console.log('commentErr', commentErr);
      } else {
        console.log(allQueryResult.rows);
        const comment = commentRes.rows;
        const allNotes = allQueryResult.rows;
        const genreQuery = 'SELECT * FROM genre ';
        pool.query(genreQuery, (genreErr, genreRes) => {
          if (genreErr) {
            console.log('genreErr', genreRes);
          } else {
            const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
            pool.query(playlistQuery, (playlistErr, playlistRes) => {
              if (playlistErr) {
                console.log('playlistErr', playlistErr);
              } else {
                const playlist = playlistRes.rows;
                const genre = genreRes.rows;
                const user = req.cookies.username;
                res.render('music', {
                  allNotes, user, genre, playlist, inputData, comment,
                });
              }
            });
          }
        });
      } // res.render('music', { allNotes, comment });}
    });
  }
  });
});

app.get('/user', (req, res) => {
  const { username } = req.cookies;
  res.redirect(`/user/${username}`);
});

app.post('/music/:index', (req, res) => {
  const inputData = req.params.index;
  const { username } = req.cookies;
  const { comment } = req.body;
  console.log(comment);
  console.log(username);
  const allQuery = `INSERT INTO comment (post, song_id, reviewer) VALUES ('${comment}', ${inputData},  '${username}')`;

  console.log(inputData);
  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    const all2Query = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username, comment.post, comment.reviewer FROM song 
  INNER JOIN artist ON song.artist = artist.id 
  INNER JOIN users ON song.uploader = users.id
  INNER JOIN comment On song.id = comment.song_id
  WHERE song.id =  ${inputData}`;

    pool.query(all2Query, (err, result) => { if (err) {
      console.log('error', err);
    } else {
      console.log(result.rows);
      const allNotes = result.rows;
      res.redirect(`/music/${inputData}`);
    }
    });
  }
  });
});

app.get('/edit', (req, res) => {
  const { username } = req.cookies;
  console.log(username);
  res.redirect(`/edit/user/${username}`);
});

app.get('/edit/user/:index', (req, res) => {
  const inputData = req.params.index;
  console.log(inputData);
  const allQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img FROM song INNER JOIN artist ON song.artist = artist.id INNER JOIN users ON song.uploader = users.id WHERE users.username = '${inputData}'`;
  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    const genreQuery = 'SELECT * FROM genre ';

    pool.query(genreQuery, (genreErr, genreRes) => {
      if (genreErr) {
        console.log('genreErr', genreRes);
      } else {
        const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
        pool.query(playlistQuery, (playlistErr, playlistRes) => {
          const playlist = playlistRes.rows;
          const genre = genreRes.rows;
          const user = req.params.index;
          const allNotes = allQueryResult.rows;
          res.render('user_edit', {
            allNotes, user, genre, playlist,
          });
        });
      }
    });
  }
  });
});

app.post('/edit/user/:index', (req, res) => {
  const { userId } = req.cookies;
  const allQuery = `INSERT INTO playlist (title, user_id) VALUES ('${req.body.playlist}', ${userId})`;

  pool.query(allQuery, (allQueryError, allQueryResult) => { if (allQueryError) {
    console.log('error', allQueryError);
  } else {
    res.redirect(`/edit/user/${req.cookies.username}`);
  }
  });
});

app.get('/edit/:index', (req, res) => {
  const songId = req.params.index;
  const songQuery = `SELECT * FROM song WHERE id = ${songId}`;
  pool.query(songQuery, (songErr, songRes) => {
    if (songErr) {
      console.log('songErr', songErr);
    } else {
      const songToEdit = songRes.rows;
      res.render('editSong', { songToEdit });
    }
  });
});

app.post('/edit/:index', (req, res) => {
  const songId = req.params.index;
  const songQuery = `UPDATE song SET title='${req.body.title}', duration='${req.body.duration}', link='${req.body.link}' WHERE id = ${songId}`;
  pool.query(songQuery, (songErr, songRes) => {
    if (songErr) {
      console.log('songErr', songErr);
    } else {
      res.redirect('/edit');
    }
  });
});

app.get('/delete/:index', (req, res) => {
  const id = req.params.index;
  const commentQuery = `DELETE FROM comment WHERE song_id = ${id}`;
  pool.query(commentQuery, (Error, result) => {
    if (Error) {
      console.log('error', Error);
    } else {
      const playlistQuery = `DELETE FROM song_in_playlist WHERE song_id = ${id}`;
      pool.query(playlistQuery, (playlistErr, playlistRes) => {
        if (playlistErr) {
          console.log('playlistErr', playlistErr);
        } else {
          const genreQuery = `DELETE FROM genre WHERE song_id = ${id}`;
          pool.query(genreQuery, (genreErr, genreRes) => {
            if (genreErr) {
              console.log('genreErr', genreErr);
            } else {
              const songQuery = `DELETE FROM song WHERE id = ${id}`;
              pool.query(songQuery, (songErr, songRes) => {
                if (songErr) {
                  console.log('songErr', songErr);
                } else {
                  res.redirect(`/edit/user/${req.cookies.username}`);
                }
              });
            }
          });
        }
      });
    }
  });
});

app.get('/playlist/add/:playlistId/:songId', (req, res) => {
  const { playlistId, songId } = req.params;
  console.log(`this is the playlist id: ${playlistId}`);
  console.log(`this is the song id: ${songId}`);
  const allQuery = `INSERT INTO song_in_playlist (song_id,playlist_id) VALUES (${songId}, ${playlistId})`;
  pool.query(allQuery, (Error, result) => {
    if (Error) {
      console.log('error', Error);
    } else {
       console.log(result.rows);
      //res.redirect(`/edit/user/${req.cookies.username}`);
    }
  });
});

app.get('/playlist/:index', (req, res) => {
  const playlist = req.params.index;
  const songsQuery = `SELECT song_in_playlist.id, song.title, song.duration, song.link, artist.name, artist.img, users.username, song_in_playlist.song_id, song_in_playlist.playlist_id FROM song 
  INNER JOIN artist ON song.artist = artist.id 
  INNER JOIN users ON song.uploader = users.id
  INNER JOIN song_in_playlist ON song.id = song_in_playlist.song_id
  WHERE song_in_playlist.playlist_id = ${playlist}`;
  pool.query(songsQuery, (songsErr, songsRes) => {
    if (songsErr) {
      console.log('songsErr', songsErr);
    } else {
      const songs = songsRes.rows;
      const genreQuery = 'SELECT * FROM genre ';
      pool.query(genreQuery, (genreErr, genreRes) => {
        if (genreErr) {
          console.log('genreErr', genreRes);
        } else {
          const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
          pool.query(playlistQuery, (playlistErr, playlistRes) => {
            if (playlistErr) {
              console.log('playlistErr', playlistErr);
            } else {
              const playlists = playlistRes.rows;
              const genre = genreRes.rows;
              const user = req.cookies.username;
              res.render('playlist', {
                songs, playlists, genre, user, playlist
              });
            }
          });
        }
      });
    }
  });
});

app.post('/search', (req, res) => {
  const { search } = req.body;
  const searchQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username FROM song 
INNER JOIN artist ON song.artist = artist.id 
INNER JOIN users ON song.uploader = users.id
WHERE LOWER(song.title) LIKE LOWER('%${search}%') 
OR LOWER(artist.name) LIKE LOWER('%${search}%')`;
  pool.query(searchQuery, (searchErr, searchRes) => {
    if (searchErr) {
      console.log('searchErr', searchErr);
    } else {
      const allNotes = searchRes.rows;
      if (allNotes.length < 1) {
        const response = 'name/artist doesnt exist, would you like to add';
        res.render('/', { response });
      } else {
        const genreQuery = 'SELECT * FROM genre ';

        pool.query(genreQuery, (genreErr, genreRes) => {
          if (genreErr) {
            console.log('genreErr', genreRes);
          } else {
            const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
            pool.query(playlistQuery, (playlistErr, playlistRes) => {
              if (playlistErr) {
                console.log('playlistErr', playlistErr);
              } else {
                const playlist = playlistRes.rows;
                const genre = genreRes.rows;
                const user = req.cookies.username;
                res.render('search', {
                  allNotes, user, genre, playlist, search,
                });
              }
            });
          }
        });
      }
    }
  });
});

app.get('/genre/:index', (req, res) => {
  const input = req.params.index;
  const searchQuery = `SELECT song.id, song.title, song.duration, song.link, artist.name, artist.img, users.username FROM song 
  INNER JOIN artist ON song.artist = artist.id 
  INNER JOIN users ON song.uploader = users.id
  INNER JOIN genre ON song.id = genre.song_id
  WHERE genre.name = '${input}'`;
  pool.query(searchQuery, (searchErr, searchRes) => {
    if (searchErr) {
      console.log('searchErr', searchErr);
    } else {
      const allNotes = searchRes.rows;
      if (allNotes.length < 1) {
        res.redirect('/');
      } else {
        const genreQuery = `SELECT * FROM genre`;
        pool.query(genreQuery, (genreErr, genreRes) => {
          if (genreErr) {
            console.log('genreErr', genreRes);
          } else{
            const playlistQuery = `SELECT * FROM playlist WHERE user_id = ${req.cookies.userId}`;
            pool.query(playlistQuery, (playlistErr, playlistRes) => {
              if (playlistErr) {
                console.log('playlistErr', playlistErr);
              }else {
                const playlist = playlistRes.rows;
                const genre = genreRes.rows;
                const user = req.cookies.username;
                res.render('artist', { allNotes, playlist, genre,user, input });
              }
            })
          }
        })
      }
    }
  });
});



app.get('/remove/:playlist/:index', (req, res) => {
  const { index, playlist } = req.params;
  const removeQuery = `DELETE FROM song_in_playlist WHERE id = ${index}`;
  pool.query(removeQuery, (removeErr, removeRes) => {
    if (removeErr) {
      console.log('removeErr', removeErr);
    } else {

      console.log(removeRes.rows)
      res.redirect(`/playlist/${playlist}`);
    }
  });
});

app.listen(3004);
