import React, { useEffect, useState } from 'react';
import { teamAPI } from '../../services/api';


export default function MyTasksPage() {

  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    teamAPI.getMyTasks()
      .then(r => setTasks(r.data))
      .catch(console.error);
  }, []);

  return (
    <div className="page">
      <h2>My Tasks</h2>

      {tasks.length === 0 ? (
        <p>No tasks assigned.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.status}</td>
                <td>{task.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}