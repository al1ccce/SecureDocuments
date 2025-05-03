const pool = require('../config/db')
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, '../server.log');

exports.getProf = async (req, res) => {
  const user_id = req.user_id; 

  try {
    const userData = await pool.query(
      'SELECT u.id, u.username, ui.name, ui.surname, ui.email ' + 
      'FROM users u ' + 
      'LEFT JOIN users_info ui ON u.id = ui.user_id ' +
      'WHERE u.id = $1'
    , [user_id]); 

    if (userData.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.status(200).json(userData.rows[0]); 
  } catch (err) {
    const message = `${new Date().toISOString()} - Ошибка получения профиля: ${err.message}\n`;
    fs.appendFileSync(logFilePath, message);
    res.status(500).json({ error: err.message });
  }
};


exports.updateProf = async (req, res) => {
  const user_id = req.user_id;
  const { username, name, surname, email } = req.body;
  console.log(user_id, username, name, surname, email);

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); // Начинаем транзакцию

    const emailCheck = await client.query(
      'SELECT 1 FROM users_info WHERE email = $1 AND user_id != $2',
      [email, user_id]
    );

    const usernameCheck = await client.query(
      'SELECT 1 FROM users WHERE username = $1 AND id != $2 ',
      [username, user_id]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({error: 'Пользователь с таким email уже существует'});
    } 

    if (usernameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({error: 'Пользователь с таким username уже существует'});
    }

    const updatedUser = await client.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username',
      [username, user_id]
    );

    console.log('Обновлённый пользователь:', updatedUser.rows[0]);

    const updatedUserInfo = await client.query(
      'UPDATE users_info SET name = $1, surname = $2, email = $3 WHERE user_id = $4 RETURNING user_id, name, surname, email',
      [name, surname, email, user_id]
    );
    console.log('Обновлённая информация о пользователе:', updatedUserInfo.rows[0]);

    await client.query('COMMIT'); // Подтверждаем транзакцию

    res.status(200).json({
      message: 'Профиль успешно обновлен',
      updatedUser: updatedUser.rows[0],
      updatedUserInfo: updatedUserInfo.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK'); // Откатываем транзакцию в случае ошибки
    const message = `${new Date().toISOString()} - Ошибка обновления профиля: ${err.message}\n`;
    fs.appendFileSync(logFilePath, message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release(); // Освобождаем клиент
  }
}

exports.getDocs= async (req, res) => {
  try {
    const user_id = req.user_id;
    const documents = await pool.query(
      'SELECT id, filename, uploaded_at FROM documents WHERE user_id = $1',
      [user_id]
    );
    res.status(200).json(documents.rows);
  } catch (err) {
    const message = `${new Date().toISOString()} - Ошибка получения документов: ${err.message}\n`;
    fs.appendFileSync(logFilePath, message);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllDocs = async (req, res) => {
  try {
    const documents = await pool.query(
      'SELECT d.id, t.name AS type, d.filename, d.uploaded_at, u.username AS author ' +
      'FROM documents d ' +
      'JOIN users u ON d.user_id = u.id ' +
      'JOIN types t ON d.type_id = t.id ' +  
      'ORDER BY d.uploaded_at DESC'
    );
      res.status(200).json(documents.rows);
    } catch (err){
      const message = `${new Date().toISOString()} - Ошибка получения документов: ${err.message}\n`;
      fs.appendFileSync(logFilePath, message);
      res.status(500).json({error: err.message});
    }
};
