package com.vignova.portal.repository;

import com.vignova.portal.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    @Query("SELECT m FROM Message m WHERE (m.sender.id = :userId OR m.receiver.id = :userId) ORDER BY m.createdAt ASC")
    List<Message> findConversation(@Param("userId") Long userId);

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :u1 AND m.receiver.id = :u2) OR (m.sender.id = :u2 AND m.receiver.id = :u1) ORDER BY m.createdAt ASC")
    List<Message> findBetweenUsers(@Param("u1") Long u1, @Param("u2") Long u2);

    long countByReceiverIdAndReadFalse(Long receiverId);
}
