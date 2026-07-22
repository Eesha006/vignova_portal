package com.vignova.portal.repository;

import com.vignova.portal.entity.BrandAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BrandAssetRepository extends JpaRepository<BrandAsset, Long> {
    List<BrandAsset> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<BrandAsset> findByClientIdAndCategory(Long clientId, String category);
}