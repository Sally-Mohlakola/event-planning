//Code for adding a task
function AddTaskPopup({ isOpen, onClose, onTaskAdd }) {

    const [taskForm, setTaskForm] = useState({
        taskName: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (taskForm.taskName.trim()) {
            onTaskAdd({
                ...taskForm,
            });
            setTaskForm({
                taskName: '',
            });
            onClose();
        }
    };

    const handleClose = () => {
        setTaskForm({
            taskName: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <section className="popup-overlay" onClick={handleClose}>
            <section className="popup-content" onClick={(e) => e.stopPropagation()}>
                <section className="popup-header">
                    <h3>Add Task</h3>
                </section>
                <section onSubmit={handleSubmit} className="task-form">
                    <section className="form-row">
                        <label>
                            Task Name *
                            <input 
                                type="text"
                                value={taskForm.taskName}
                                onChange={(e) => setTaskForm({...taskForm, taskName: e.target.value})}
                                required
                                autoFocus
                            />
                        </label>
                    </section>
                    <section className="form-actions">
                        <button type="button" className="cancel-form-btn" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="save-form-btn" onClick={handleSubmit}>
                            Add Task
                        </button>
                    </section>
                </section>
            </section>
        </section>
    );
}
//end of adding a task

function EditTaskPopup({ isOpen, onClose, onTaskEdit, taskToEdit }) {
    const [taskForm, setTaskForm] = useState({
        taskName: taskToEdit || "",
    });

     useEffect(() => {
        setTaskForm({ taskName: taskToEdit || "" });
    }, [taskToEdit]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (taskForm.taskName.trim()) {
            onTaskEdit(taskToEdit, taskForm.taskName); // pass old and new task names
            setTaskForm({
                taskName: "",
            });
            onClose();
        }
    };

    const handleClose = () => {
        setTaskForm({
            taskName: "",
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <section className="popup-overlay" onClick={handleClose}>
            <section className="popup-content" onClick={(e) => e.stopPropagation()}>
                <section className="popup-header">
                    <h3>Edit Task</h3>
                </section>
                <form onSubmit={handleSubmit} className="task-form">
                    <section className="form-row">
                        <label>
                            Task Name *
                            <input
                                type="text"
                                value={taskForm.taskName}
                                onChange={(e) =>
                                    setTaskForm({ ...taskForm, taskName: e.target.value })
                                }
                                required
                                autoFocus
                            />
                        </label>
                    </section>
                    <section className="form-actions">
                        <button type="button" className="cancel-form-btn" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="save-form-btn">
                            Save
                        </button>
                    </section>
                </form>
            </section>
        </section>
    );
}

//Code for deleting a task
function DeleteTaskPopup({ isOpen, onClose, onTaskDelete, taskToDelete }) {
    const handleSubmit = () => {
        onTaskDelete(taskToDelete); // pass only task name
        onClose();
    };

    const handleClose = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <section className="popup-overlay" onClick={handleClose} role="dialog" aria-modal="true">
            <section className="popup-content" onClick={(e) => e.stopPropagation()}>
                <section className="popup-header">
                    <h3>Delete Task?</h3>
                </section>
                <section className="delete-confirmation">
                    <p>Are you sure you want to delete the task "{taskToDelete}"? This action cannot be undone.</p>
                </section>
                <button type="button" className="cancel-form-btn" onClick={handleClose}>
                    Cancel
                </button>
                <button type="button" className="delete-form-btn" onClick={handleSubmit}>
                    Delete
                </button>
            </section>
        </section>
    );
}
//end of deleting a task


//Code for one task list item **********
function TaskItem({ taskName, taskStatus, onToggle, onEdit, onDelete }) {
    const isCompleted = taskStatus === true;

    return (
        <section className="task-item">
            <section className="task-checkbox">
                <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => onToggle(taskName)}
                />
            </section>
            <section className="task-content">
                <h4 className={isCompleted ? "completed" : ""}>{taskName}</h4>
            </section>
            <section className="task-actions">
                <button className="edit-btn" onClick={() => onEdit(taskName)}>Edit</button>
                <button className="delete-btn" onClick={() => onDelete(taskName)}>Delete</button>
            </section>
        </section>
    );
}

//End of code for one task list item **********

export default function PlannerTasks({event, }) {
    const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
    const [showEditTaskPopup, setShowEditTaskPopup] = useState(false);
    const [showDeleteTaskPopup, setShowDeleteTaskPopup] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const  [taskToDelete, setTaskToDelete] = useState(null);

    useEffect(() => {
        if(showAddTaskPopup === true){
            
        }
    }, [showAddTaskPopup]);

    useEffect(() => {
        if(showEditTaskPopup === true){
            
        }
    }, [showEditTaskPopup]);

    useEffect(() => {
        if(showDeleteTaskPopup === true){
            
        }
    }, [showDeleteTaskPopup]);

    // change task info
   const onTaskAdd = async (taskInfo) => {
        // Build the new eventData object with the new task
        const updatedEventData = {
            ...eventData,
            tasks: {
            ...eventData.tasks,
            [taskInfo.taskName]: {
                completed: false,
            },
            },
        };

        // Update React state
        setEventData(updatedEventData);

        // Send updated object to backend
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(
            `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}`,
            {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedEventData), // 👈 send the new object
            }
        );

        if (res.ok) {
            <section className="tasks-list">
                {eventData.tasks && Object.keys(eventData.tasks).length > 0 ? (
                Object.entries(eventData.tasks).map(([taskName,completed], i) => (
                    <TaskItem
                        key={`${taskName}-${i}`}
                        taskName={taskName}
                        taskStatus={completed}
                        onToggle={onTaskToggle}
                        />
                        ))
                        ) : (
                        <section className="empty-state">
                            <p>No tasks added yet. Click "Add Task" to start organizing your event planning.</p>
                        </section>
                        )}
            </section>
        }else {
            console.error("Update Failed");
        } 
    };

    const onTaskEdit = async (oldName, newName) => {
        const updatedTasks = { ...eventData.tasks };
        const completedStatus = updatedTasks[oldName]?.completed || false;

        delete updatedTasks[oldName];
        updatedTasks[newName] = { completed: completedStatus };

        const updatedEventData = { ...eventData, tasks: updatedTasks };
        setEventData(updatedEventData);

        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(
            `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedEventData),
            }
        );

        if (res.ok) {
            <section className="tasks-list">
                {eventData.tasks && Object.keys(eventData.tasks).length > 0 ? (
                Object.entries(eventData.tasks).map(([taskName,completed], i) => (
                    <TaskItem
                        key={`${taskName}-${i}`}
                        taskName={taskName}
                        taskStatus={completed}
                        onToggle={onTaskToggle}
                        />
                        ))
                        ) : (
                        <section className="empty-state">
                            <p>No tasks added yet. Click "Add Task" to start organizing your event planning.</p>
                        </section>
                        )}
            </section>} else {console.error("Task update failed");}
    };

   const onTaskToggle = async (taskName) => {
        const updatedTasks = { ...eventData.tasks };

        // Flip the current completed status
        const completedStatus = !(updatedTasks[taskName]?.completed ?? false);

        updatedTasks[taskName] = { completed: completedStatus };

        const updatedEventData = { ...eventData, tasks: updatedTasks };
        setEventData(updatedEventData);

        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(
            `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedEventData),
            }
        );

        if (res.ok) {
            
        } else {
            console.error("Task update failed");
        }
    };



    const onTaskDelete = async (taskName) => {
        const updatedTasks = { ...eventData.tasks };
        delete updatedTasks[taskName];

        const updatedEventData = { ...eventData, tasks: updatedTasks };

        setEventData(updatedEventData); // Update state immediately for UI responsiveness

        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(
            `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedEventData),
            }
        );

        if (res.ok) {
            console.log("Task deleted successfully");
                <section className="tasks-list">
                    {eventData.tasks && Object.keys(eventData.tasks).length > 0 ? (
                    Object.entries(eventData.tasks).map(([taskName,completed], i) => (
                        <TaskItem
                            key={`${taskName}-${i}`}
                            taskName={taskName}
                            taskStatus={completed}
                            onToggle={onTaskToggle}
                            />
                            ))
                            ) : (
                            <section className="empty-state">
                                <p>No tasks added yet. Click "Add Task" to start organizing your event planning.</p>
                            </section>
                            )}
                </section>} else {
                    console.error("Delete Failed");
                    // Optionally revert state change if deletion fails
                    setEventData(eventData);
                }
        };

        <section className="tasks-content">
                            <section className="tasks-header">
                                <h3>Event Tasks</h3>
                                <button className="add-task-btn" onClick={() => setShowAddTaskPopup(true)}>+ Add Task</button>
                            </section>
                                <section className="tasks-list">
                                    {eventData.tasks && Object.keys(eventData.tasks).length > 0 ? (
                                        Object.entries(eventData.tasks).map(([taskName, task], i) => (
                                            <TaskItem
                                                key={`${taskName}-${i}`}
                                                taskName={taskName}
                                                taskStatus={task.completed}
                                                onToggle={onTaskToggle}
                                                onEdit={() => {
                                                        setTaskToEdit(taskName); // save current task name
                                                        setShowEditTaskPopup(true); // show popup
                                                    }}
                                                onDelete={() => {
                                                    setShowDeleteTaskPopup(true);
                                                    setTaskToDelete(taskName);
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <section className="empty-state">
                                            <p>No tasks added yet. Click "Add Task" to start organizing your event planning.</p>
                                        </section>
                                    )}
                                </section>
                                {showAddTaskPopup && (
                                        <section>
                                            <AddTaskPopup isOpen={true} onClose={() => setShowAddTaskPopup(false)} onTaskAdd={onTaskAdd}/>
                                        </section>
                                    )}
                                {showEditTaskPopup && (
                                    <section>
                                        <EditTaskPopup isOpen={true} onClose={() => setShowEditTaskPopup(false)} onTaskEdit={onTaskEdit} taskToEdit={taskToEdit}/>
                                    </section>
                                )}
                                {showDeleteTaskPopup && (
                                    <section>
                                        <DeleteTaskPopup isOpen={true} onClose={() => setShowDeleteTaskPopup(false)} onTaskDelete={onTaskDelete} taskToDelete={taskToDelete}/>
                                    </section>
                                )}
                        </section>
}